<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * In this file, incoming AJAX request from the Store Adapter in index.js are handled.
 * These requests concern the creation, retrieval and deletion of annotations
 * and comments as well as the editing/shifting of annotations and the reporting
 * of comments that are deemed inappropriate.
 *
 * The file also handles incoming AJAX requests from overview.js,
 * which control the behaviour of the overview page. These requests are concerned with
 * 1. teacheroverview: hide, redisplay and delete reports
 * 2. studentoverview: hide, redisplay and delete answer notifications (yet to be completed)
 *
 * @package   mod_pdfannotator
 * @copyright 2018 RWTH Aachen (see README.md)
 * @author    Rabea de Groot, Anna Heynkes, Friederike Schwager
 * @license   http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

use mod_pdfannotator\output\comment;
use mod_pdfannotator\output\printview;
use mod_pdfannotator\recycle_bin;

require_once('../../config.php');
require_once('model/annotation.class.php');
require_once('model/comment.class.php');
require_once('reportform.php');
require_once($CFG->dirroot . '/mod/pdfannotator/locallib.php');

$documentid = required_param('documentId', PARAM_PATH);
$action = required_param('action', PARAM_ALPHA); // ...'$action' determines what is to be done; see below.

$pdfannotator = $DB->get_record('pdfannotator', array('id' => $documentid), '*', MUST_EXIST);
$cm = get_coursemodule_from_instance('pdfannotator', $documentid, $pdfannotator->course, false, MUST_EXIST);
$context = context_module::instance($cm->id);

require_course_login($pdfannotator->course, true, $cm);
require_capability('mod/pdfannotator:view', $context);



function pdfannotator_debuglog_append($context, $tag, $payload) {
    global $USER, $CFG;
    $dir = (isset($CFG->dataroot) ? $CFG->dataroot : sys_get_temp_dir()) . '/pdfannotator_runtime';
    if (!is_dir($dir)) {
        @mkdir($dir, 0777, true);
    }
    $file = $dir . '/runtime.log';

    // Keep file bounded.
    if (file_exists($file) && filesize($file) > 2 * 1024 * 1024) {
        @file_put_contents($file, "", LOCK_EX);
    }

    $entry = array(
        'ts' => time(),
        'tag' => $tag,
        'userid' => isset($USER->id) ? (int)$USER->id : 0,
        'contextid' => isset($context->id) ? (int)$context->id : 0,
        'payload' => $payload,
    );
    @file_put_contents($file, json_encode($entry, JSON_UNESCAPED_UNICODE) . "
", FILE_APPEND | LOCK_EX);
}

$readonlyactions = array('read', 'readbatch', 'readsingle', 'getInformation', 'getComments', 'getQuestions', 'getCommentsToPrint', 'searchComments', 'listRecycle');
if (!in_array($action, $readonlyactions, true)) {
    require_sesskey();
}

// Prevent browser/proxy caching for AJAX API responses (critical for reuse freshness).
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Cache-Control: post-check=0, pre-check=0', false);
header('Pragma: no-cache');
header('Expires: 0');

if ($action === 'debugLog') {
    // Require sesskey to prevent anonymous spam.
    require_sesskey();

    $tag = optional_param('tag', 'client', PARAM_ALPHANUMEXT);
    $msg = optional_param('msg', '', PARAM_TEXT);
    $extra = optional_param('extra', '', PARAM_RAW);
    $href = optional_param('href', '', PARAM_RAW);

    $payload = array(
        'msg' => $msg,
        'href' => $href,
        'extra' => $extra,
    );
    pdfannotator_debuglog_append($context, $tag, $payload);
    echo json_encode(array('status' => 'ok'));
    return;
}


/* * ****************************************** 1. HANDLING ANNOTATIONS ****************************************** */
/* * ************************************************************************************************************* */

/* * ********************** Retrieve all annotations (of current page) from db for display *********************** */

function pdfannotator_prepare_annotations_payload($records, $context, $userid, &$skippedvisibility) {
    global $DB;

    $annotations = array();
    $recordsbyannotation = array();
    $annotationids = array();

    foreach ($records as $record) {
        $rid = (int)$record->id;
        $recordsbyannotation[$rid] = $record;
        $annotationids[] = $rid;
    }

    $questionbyannotation = array();
    if (!empty($annotationids)) {
        list($insql, $inparams) = $DB->get_in_or_equal($annotationids, SQL_PARAMS_NAMED);
        $questions = $DB->get_records_select(
            'pdfannotator_comments',
            "annotationid $insql AND isquestion = 1",
            $inparams,
            '',
            'id,annotationid,visibility,userid,isquestion'
        );
        foreach ($questions as $question) {
            $aid = (int)$question->annotationid;
            if (!isset($questionbyannotation[$aid])) {
                $questionbyannotation[$aid] = $question;
            }
        }
    }

    $hascommentsbyannotation = array();
    if (!empty($annotationids)) {
        list($sqlhc, $paramshc) = $DB->get_in_or_equal($annotationids, SQL_PARAMS_NAMED);
        $commentrows = $DB->get_records_select(
            'pdfannotator_comments',
            "annotationid $sqlhc AND isdeleted = 0",
            $paramshc,
            'id ASC',
            'id,annotationid,userid,visibility,isquestion,posttype,parentid,ishidden'
        );
        $seehiddencomments = has_capability('mod/pdfannotator:seehiddencomments', $context);
        foreach ($commentrows as $crow) {
            if (!pdfannotator_can_see_comment($crow, $context)) {
                continue;
            }
            if (!empty($crow->ishidden) && !$seehiddencomments) {
                continue;
            }
            $hascommentsbyannotation[(int) $crow->annotationid] = true;
        }
    }

    foreach ($recordsbyannotation as $record) {
        $rid = (int)$record->id;
        $comment = isset($questionbyannotation[$rid]) ? $questionbyannotation[$rid] : null;
        if ($comment && !pdfannotator_can_see_comment($comment, $context)) {
            $skippedvisibility += 1;
            continue;
        }

        $entry = json_decode($record->data);
        if (!$entry) {
            continue;
        }

        $entry->type = pdfannotator_get_annotationtype_name($record->annotationtypeid);
        if ($entry->type == 'pin') {
            $entry->type = 'point';
        }
        $entry->class = "Annotation";
        $entry->page = (int)$record->page;
        $entry->uuid = $record->id;
        $entry->owner = ((int)$record->userid === (int)$userid);
        $entry->hasComments = !empty($hascommentsbyannotation[$rid]);
        $annotations[] = $entry;
    }

    return $annotations;
}

if ($action === 'read') {
    global $DB, $USER;

    $page = optional_param('page_Number', 1, PARAM_INT);
    $records = $DB->get_records('pdfannotator_annotations', array('pdfannotatorid' => $documentid, 'page' => $page));

    $skippedvisibility = 0;
    $annotations = pdfannotator_prepare_annotations_payload($records, $context, $USER->id, $skippedvisibility);

    $tldbg = optional_param('tl_dbg', 0, PARAM_INT);
    if (!empty($tldbg)) {
        pdfannotator_debuglog_append($context, 'read_post', array(
            'documentid' => $documentid,
            'page' => $page,
            'annotations' => is_array($annotations) ? count($annotations) : 0,
            'skipped_visibility' => $skippedvisibility
        ));
    }

    $data = array('documentId' => $documentid, 'pageNumber' => $page, 'annotations' => $annotations);
    echo json_encode($data);
}

if ($action === 'readbatch') {
    global $DB, $USER;

    $pagesraw = optional_param('pages', '', PARAM_RAW_TRIMMED);
    $pages = array();
    if ($pagesraw !== '') {
        $decoded = json_decode($pagesraw, true);
        if (is_array($decoded)) {
            foreach ($decoded as $value) {
                $pagevalue = (int)$value;
                if ($pagevalue > 0) {
                    $pages[$pagevalue] = $pagevalue;
                }
            }
        }
    }

    if (empty($pages)) {
        echo json_encode(array('documentId' => $documentid, 'pages' => array()));
        return;
    }

    $pages = array_values($pages);
    sort($pages);

    list($insql, $inparams) = $DB->get_in_or_equal($pages, SQL_PARAMS_NAMED);
    $params = array_merge(array('pdfannotatorid' => $documentid), $inparams);
    $records = $DB->get_records_select(
        'pdfannotator_annotations',
        "pdfannotatorid = :pdfannotatorid AND page $insql",
        $params,
        'page ASC, id ASC'
    );

    $skippedvisibility = 0;
    $annotations = pdfannotator_prepare_annotations_payload($records, $context, $USER->id, $skippedvisibility);

    $grouped = array();
    foreach ($pages as $page) {
        $grouped[(string)$page] = array();
    }
    foreach ($annotations as $entry) {
        $key = (string)((int)$entry->page);
        if (!array_key_exists($key, $grouped)) {
            $grouped[$key] = array();
        }
        $grouped[$key][] = $entry;
    }

    echo json_encode(array(
        'documentId' => $documentid,
        'pages' => $grouped,
        'skipped_visibility' => $skippedvisibility
    ));
}

/* * **************************** Select a single annotation from db for shifting ********************************** */

/* * **************************** Select a single annotation from db for shifting ********************************** */

if ($action === 'readsingle') {

    global $DB, $USER;
    $annotationid = required_param('annotationId', PARAM_INT);
    $page = optional_param('page_Number', 1, PARAM_INT);

    $record = $DB->get_record('pdfannotator_annotations', array('id' => $annotationid), '*', MUST_EXIST);

    $annotation = json_decode($record->data);
    // Add general annotation data.
    $annotation->type = pdfannotator_get_annotationtype_name($record->annotationtypeid);
    // The following 3 lines can be removed after deletion of the original annotation tables.
    if ($annotation->type == 'pin') {
        $annotation->type = 'point';
    }
    $annotation->class = "Annotation";
    $annotation->page = $record->page;
    $annotation->uuid = $record->id;
    $annotation->owner = ($record->userid == $USER->id);
    $data = array('documentId' => $documentid, 'annotation' => $annotation);
    echo json_encode($data);
    return;
}

/* * ********************************** Save (1) and display (2) a new annotation ********************************** */

if ($action === 'create') {

    global $DB;
    global $USER;

    require_capability('mod/pdfannotator:create', $context);

    $table = "pdfannotator_annotations";

    $pageid = required_param('page_Number', PARAM_INT);

    // 1.1 Get the annotation data and decode the json wrapper.
    $annotationjs = required_param('annotation', PARAM_TEXT);
    $annotation = json_decode($annotationjs, true);
    // 1.2 Determine the type of the annotation.
    $type = $annotation['type'];
    $typeid = pdfannotator_get_annotationtype_id($type);
    if ($typeid == null) {
        echo json_encode(['status' => 'error', 'log' => get_string('error:missingAnnotationtype', 'pdfannotator')]);
        return;
    }
    // 1.3 Set the type-specific data of the annotation.
    $data = [];
    switch ($type) {
        case 'area':
            $data['x'] = $annotation['x'];
            $data['y'] = $annotation['y'];
            $data['width'] = $annotation['width'];
            $data['height'] = $annotation['height'];
            break;
        case 'drawing':
            $studentdrawingsallowed = $DB->get_field('pdfannotator', 'use_studentdrawing', ['id' => $documentid],
                $strictness = MUST_EXIST);
            $alwaysdrawingallowed = has_capability('mod/pdfannotator:usedrawing', $context);
            if ($studentdrawingsallowed != 1 && !$alwaysdrawingallowed) {
                echo json_encode(['status' => 'error', 'reason' => get_string('studentdrawingforbidden', 'pdfannotator')]);
                return;
            }
            $data['width'] = $annotation['width'];
            $data['color'] = $annotation['color'];
            $data['lines'] = $annotation['lines'];
            break;
        case 'highlight':
            $data['color'] = $annotation['color'];
            $data['rectangles'] = $annotation['rectangles'];
            break;
        case 'point':
            $data['x'] = $annotation['x'];
            $data['y'] = $annotation['y'];
            break;
        case 'strikeout':
            $data['color'] = $annotation['color'];
            $data['rectangles'] = $annotation['rectangles'];
            break;
        case 'textbox':
            $studenttextboxesallowed = $DB->get_field('pdfannotator', 'use_studenttextbox', array('id' => $documentid),
                $strictness = MUST_EXIST);
            $alwaystextboxallowed = has_capability('mod/pdfannotator:usetextbox', $context);
            if ($studenttextboxesallowed != 1 && !$alwaystextboxallowed) {
                echo json_encode(['status' => 'error', 'reason' => get_string('studenttextboxforbidden', 'pdfannotator')]);
                return;
            }
            $data['x'] = $annotation['x'];
            $data['y'] = $annotation['y'];
            $data['width'] = $annotation['width'];
            $data['height'] = $annotation['height'];
            $data['size'] = $annotation['size'];
            $data['color'] = $annotation['color'];
            $data['content'] = $annotation['content'];
            break;
    }
    $insertiondata = json_encode($data);

    // 1.4 Insert a new record into mdl_pdfannotator_annotations.
    $newannotationid = $DB->insert_record($table, array("pdfannotatorid" => $documentid, "page" => $pageid, "userid" => $USER->id,
        "annotationtypeid" => $typeid, "data" => $insertiondata, "timecreated" => time()), true, false);
    // 2. If the insertion was successful...
    if (isset($newannotationid) && $newannotationid !== false && $newannotationid > 0) {
        // 2.1 set additional data to send back to the client.
        $data['uuid'] = $newannotationid;
        $data['type'] = $type;
        if ($type == 'pin') {
            $data['type'] = 'point';
        }
        $data['class'] = "Annotation";
        $data['page'] = $pageid;
        $data['status'] = 'success';
        $data['owner'] = true;

        // 2.2 and send it off for display.
        echo json_encode($data);
    } else { // If not, return an error message.
        echo json_encode(['status' => 'error']);
    }
}

/* * ****************************************** Update an annotation ****************************************** */

if ($action === 'update') {
    require_capability('mod/pdfannotator:edit', $context);

    // 1. Get the id of the annotation that is to be shifted in position.
    $annotationid = required_param('annotationId', PARAM_INT);

    // 2. Get the updated annotation data received for storage and decode its json wrapper.
    $datajs = required_param('annotation', PARAM_TEXT);
    $data = json_decode($datajs, true);

    // 3. Check whether the current user is allowed to shift this annotation,
    // i.e. whether it's theirs or they are an admin.
    if (pdfannotator_annotation::shifting_allowed($annotationid, $context)) {

        $annotation = $data['annotation'];
        $type = $annotation['type'];
        $newdata = [];

        // 4. If so, update the annotations 'data' attribute in mdl_pdfannotator_annotations.
        // Note that while only part of the data may change, the whole JSON-string has to be construced anew.
        // e.g. drawing: Only the 'lines' actually change, but the database stores them together with width
        // and color in a single JSON-string called 'data'.
        switch ($type) {

            case 'area':
                $newdata['x'] = $annotation['x'];
                $newdata['y'] = $annotation['y'];
                $newdata['width'] = $annotation['width'];
                $newdata['height'] = $annotation['height'];
                break;

            case 'drawing':
                $newdata['width'] = $annotation['width'];
                $newdata['color'] = $annotation['color'];
                $newdata['lines'] = $annotation['lines'];
                break;

            case 'point':
                $newdata['x'] = $annotation['x'];
                $newdata['y'] = $annotation['y'];
                break;

            case 'textbox':
                $newdata['x'] = $annotation['x'];
                $newdata['y'] = $annotation['y'];
                $newdata['width'] = $annotation['width'];
                $newdata['height'] = $annotation['height'];
                $newdata['size'] = $annotation['size'];
                $newdata['color'] = $annotation['color'];
                $newdata['content'] = $annotation['content'];
                break;
        }

        $result = pdfannotator_annotation::update($annotationid, $newdata);

        // 5. If the updated data received from the Store Adapter could successfully be inserted in db, send it back for display.
        if ($result['status'] == 'success') {
            echo json_encode($result);
        } else {
            echo json_encode(['status' => 'error']);
        }
    } else {
        echo json_encode(['status' => 'error']);
    }
}


if ($action === 'listRecycle') {
    global $USER;
    $items = recycle_bin::list_for_user((int) $documentid, $context, (int) $USER->id);
    echo json_encode(['items' => $items]);
}

if ($action === 'restoreRecycle') {
    $entryid = required_param('entryId', PARAM_INT);
    $data = recycle_bin::restore($entryid, (int) $documentid, $context);
    echo json_encode($data);
}

/* * ****************************************** Delete an annotation ****************************************** */

if ($action === 'delete') {

    // Get annotation itemid and course module id.
    $annotationid = required_param('annotation', PARAM_INT);

    // Delete annotation if user is permitted to do so.
    $success = pdfannotator_annotation::delete($annotationid, $cm->id);

    // For completeness's sake...
    if ($success === true) {
        echo json_encode(['status' => 'success']);
    } else {
        echo json_encode(['status' => 'error', 'reason' => $success]);
    }
}

/* * ********************************** Retrieve all questions of a specific page or document ********************************** */

if ($action === 'searchComments') {
    $q = optional_param('q', '', PARAM_TEXT);
    $q = trim($q);
    if ($q === '') {
        echo json_encode([]);
    } else {
        $results = pdfannotator_comment::search_all_comments($documentid, $q, $context);
        echo json_encode($results);
    }
}

if ($action === 'getQuestions') {

    $pageid = optional_param('page_Number', -1, PARAM_INT); // Default is 1.
    $pattern = optional_param('pattern', '', PARAM_TEXT);

    if ($pattern !== '') {
        $questions = pdfannotator_comment::get_questions_search($documentid, $pattern, $context);
        echo json_encode($questions);
    } else if ($pageid == -1) {
        $questions = pdfannotator_comment::get_all_questions($documentid, $context);
        $pdfannotatorname = $DB->get_field('pdfannotator', 'name', array('id' => $documentid), $strictness = MUST_EXIST);
        $result = array('questions' => $questions, 'pdfannotatorname' => $pdfannotatorname);
        echo json_encode($result);
    } else {
        $questions = pdfannotator_comment::get_questions($documentid, $pageid, $context);
        echo json_encode($questions);
    }
}

/* * *************************************** 2. HANDLING COMMENTS ****************************************** */
/* * ******************************************************************************************************* */

/* * **************************** Save a new comment and return it for display ***************************** */

if ($action === 'addComment') {

    require_capability('mod/pdfannotator:create', $context);

    // Get the annotation to be commented.
    $annotationid = required_param('annotationId', PARAM_INT);
    $PAGE->set_context($context);

    // Get the comment data.
    $content = required_param('content', PARAM_RAW);
    $regex = "/?time=[0-9]*/";
    $extractedcontent = str_replace($regex, "", $content);

    $visibility = required_param('visibility', PARAM_ALPHA);
    // New: posttype + parentid; legacy bridge for old JS clients.
    if (isset($_POST['posttype'])) {
        $posttype = optional_param('posttype', 'comment', PARAM_ALPHA);
        $parentid = optional_param('parentid', 0, PARAM_INT);
    } else {
        $islegacy = optional_param('isquestion', -1, PARAM_INT);
        $posttype  = ($islegacy === 1) ? 'question' : 'comment';
        $parentid  = 0;
    }
    // Insert the comment into the mdl_pdfannotator_comments table and get its record id.
    $comment = pdfannotator_comment::create($documentid, $annotationid, $extractedcontent, $visibility, $posttype, $parentid, $cm, $context);

    // If successful, create a comment array and return it as json.
    if ($comment) {
        $myrenderer = $PAGE->get_renderer('mod_pdfannotator');
        $templatable = new comment($comment, $cm, $context);
        $data = $templatable->export_for_template($myrenderer);

        echo json_encode($data);
    } else {
        echo json_encode(['status' => '-1']);
    }

}

/* * ******************************* Retrieve information about a specific annotation from db ******************************* */

if ($action === 'getInformation') { // This concerns only textbox and drawing.

    $annotationid = required_param('annotationId', PARAM_INT);

    $comment = pdfannotator_annotation::get_information($annotationid);
    if ($comment) {
        $myrenderer = $PAGE->get_renderer('mod_pdfannotator');
        $templatable = new comment($comment, $cm, $context);
        $data = $templatable->export_for_template($myrenderer);

        echo json_encode($data);
    } else {
        echo json_encode(['status' => 'error']);
    }
}

/* * ********************************* Retrieve all comments for a specific annotation from db ********************************* */

if ($action === 'getComments') {

    $annotationid = required_param('annotationId', PARAM_INT);

    // Create an array of all comment objects on the specified page and annotation.

    $comments = pdfannotator_comment::read($documentid, $annotationid, $context);

    $myrenderer = $PAGE->get_renderer('mod_pdfannotator');
    $templatable = new comment($comments, $cm, $context);

    $data = $templatable->export_for_template($myrenderer);

    echo json_encode($data);
}

/* * ****************************************** Hide a comment for participants ****************************************** */

if ($action === 'hideComment') {

    $commentid = required_param('commentId', PARAM_INT);

    $data = pdfannotator_comment::hide_comment($commentid, $cm->id);
    echo json_encode($data);
}


/* * ****************************************** Redisplay a comment for participants ****************************************** */

if ($action === 'redisplayComment') {

    $commentid = required_param('commentId', PARAM_INT);

    $data = pdfannotator_comment::redisplay_comment($commentid, $cm->id);
    echo json_encode($data);
}

/* * ****************************************** Delete a comment ****************************************** */

if ($action === 'deleteComment') {

    $commentid = required_param('commentId', PARAM_INT);

    $data = pdfannotator_comment::delete_comment($commentid, $cm->id);
    echo json_encode($data);
}

/* * ****************************************** Edit a comment ****************************************** */

if ($action === 'editComment') {

    require_capability('mod/pdfannotator:edit', $context);

    $editanypost = has_capability('mod/pdfannotator:editanypost', $context);

    $commentid = required_param('commentId', PARAM_INT);
    $content = required_param('content', PARAM_RAW);
    $regex = "/?time=[0-9]*/";
    $extractedcontent = str_replace($regex, "", $content);

    $data = pdfannotator_comment::update($commentid, $extractedcontent, $editanypost, $context);
    echo json_encode($data);
}

/* * ****************************************** Vote for a comment ****************************************** */

if ($action === 'voteComment') {

    require_capability('mod/pdfannotator:vote', $context);

    global $DB;

    $commentid = required_param('commentid', PARAM_INT);

    $commentrow = $DB->get_record('pdfannotator_comments', array('id' => $commentid), 'id,isquestion,posttype');
    if (!$commentrow) {
        echo json_encode(['status' => 'error', 'reason' => 'notfound']);
    } else {
        $isquestionvote = ((int) $commentrow->isquestion === 1)
            || (strtolower(trim($commentrow->posttype ?? '')) === 'question');
        if (!$isquestionvote) {
            echo json_encode(['status' => 'error', 'reason' => 'vote_question_only']);
        } else {
            $numbervotes = pdfannotator_comment::insert_vote($documentid, $commentid);

            if ($numbervotes) {
                echo json_encode(['status' => 'success', 'numberVotes' => $numbervotes]);
            } else {
                echo json_encode(['status' => 'error', 'reason' => 'vote_failed']);
            }
        }
    }
}

/* * ****************************************** Remove vote (same-question) ****************************************** */

if ($action === 'unvoteComment') {

    require_capability('mod/pdfannotator:vote', $context);

    global $DB;

    $commentid = required_param('commentid', PARAM_INT);

    $commentrow = $DB->get_record('pdfannotator_comments', array('id' => $commentid), 'id,isquestion,posttype');
    if (!$commentrow) {
        echo json_encode(['status' => 'error', 'reason' => 'notfound']);
    } else {
        $isquestionvote = ((int) $commentrow->isquestion === 1)
            || (strtolower(trim($commentrow->posttype ?? '')) === 'question');
        if (!$isquestionvote) {
            echo json_encode(['status' => 'error', 'reason' => 'vote_question_only']);
        } else {
            $numbervotes = pdfannotator_comment::delete_vote($documentid, $commentid);
            if ($numbervotes !== false) {
                echo json_encode(['status' => 'success', 'numberVotes' => (int) $numbervotes]);
            } else {
                echo json_encode(['status' => 'error', 'reason' => 'unvote_failed']);
            }
        }
    }
}

/* * ****************************************** Subscribe to a question  ****************************************** */

if ($action === 'subscribeQuestion') {

    require_capability('mod/pdfannotator:subscribe', $context);

    global $DB;
    $annotationid = required_param('annotationid', PARAM_INT);
    $departure = optional_param('fromoverview', 0, PARAM_INT);
    $itemsperpage = optional_param('itemsperpage', 5, PARAM_INT);
    $itemsperpage = pdfannotator_normalize_itemsperpage($itemsperpage);

    $annotatorid = $DB->get_field('pdfannotator_annotations', 'pdfannotatorid', ['id' => $annotationid], $strictness = MUST_EXIST);

    $subscriptionid = pdfannotator_comment::insert_subscription($annotationid, $context);

    if ($departure == 1) {
        $thisannotator = $pdfannotator->id;
        $thiscourse = $pdfannotator->course;
        $cmid = get_coursemodule_from_instance('pdfannotator', $thisannotator, $thiscourse, false, MUST_EXIST)->id;

        $urlparams = array('action' => 'overviewanswers', 'id' => $cmid, 'page' => 0, 'itemsperpage' => $itemsperpage,
            'answerfilter' => 0);
        $url = new moodle_url($CFG->wwwroot . '/mod/pdfannotator/view.php', $urlparams);
        redirect($url->out());
        return;
    }

    if ($subscriptionid) {
        echo json_encode(['status' => 'success', 'annotationid' => $annotationid, 'subscriptionid' => $subscriptionid]);
    } else {
        echo json_encode(['status' => 'error']);
    }
}

/* * ****************************************** Unsubscribe from a question  ****************************************** */

if ($action === 'unsubscribeQuestion') {

    require_capability('mod/pdfannotator:subscribe', $context);

    global $DB;
    $annotationid = required_param('annotationid', PARAM_INT);
    $departure = optional_param('fromoverview', 0, PARAM_INT);
    $itemsperpage = optional_param('itemsperpage', 5, PARAM_INT);
    $itemsperpage = pdfannotator_normalize_itemsperpage($itemsperpage);

    $annotatorid = $DB->get_field('pdfannotator_annotations', 'pdfannotatorid', ['id' => $annotationid], $strictness = MUST_EXIST);

    $subscriptionid = pdfannotator_comment::delete_subscription($annotationid);

    if ($departure == 1) {
        $thisannotator = $pdfannotator->id;
        $thiscourse = $pdfannotator->course;
        $cmid = get_coursemodule_from_instance('pdfannotator', $thisannotator, $thiscourse, false, MUST_EXIST)->id;

        $urlparams = array('action' => 'overviewanswers', 'id' => $cmid, 'page' => 0, 'itemsperpage' => $itemsperpage);
        $url = new moodle_url($CFG->wwwroot . '/mod/pdfannotator/view.php', $urlparams);
        redirect($url->out());
        return;
    }

    if ($subscriptionid) {
        echo json_encode(['status' => 'success', 'annotationid' => $annotationid, 'subscriptionid' => $subscriptionid,
            'annotatorid' => $annotatorid]);
    } else {
        echo json_encode(['status' => 'error']);
    }
}

/* * ****************************************** Mark a question as closed or an answer as correct ******************************* */

if ($action === 'markSolved') {
    global $DB;
    $commentid = required_param('commentid', PARAM_INT);
    $success = pdfannotator_comment::mark_solved($commentid, $context);

    if ($success) {
        echo json_encode(['status' => 'success']);
    } else {
        echo json_encode(['status' => 'error']);
    }
}

/* * ****************************************** 3. HANDLING REPORTS (teacheroverview) ****************************************** */
/* * ************************************************************************************************************* */

/* * ********************************* 3.1 Mark a report as seen and don't display it any longer *************************** */

if ($action === 'markReportAsSeen') {

    require_capability('mod/pdfannotator:viewreports', $context);
    require_once($CFG->dirroot . '/mod/pdfannotator/model/pdfannotator.php');

    global $DB;
    $reportid = required_param('reportid', PARAM_INT);
    $openannotator = required_param('openannotator', PARAM_INT);

    if ($DB->update_record('pdfannotator_reports', array("id" => $reportid, "seen" => 1), $bulk = false)) {
        echo json_encode(['status' => 'success', 'reportid' => $reportid]);
    } else {
        echo json_encode(['status' => 'error']);
    }
}

/* * ********************************* 3.2 Mark a hidden report as unseen and display it once more ************************* */

if ($action === 'markReportAsUnseen') {

    require_capability('mod/pdfannotator:viewreports', $context);
    require_once($CFG->dirroot . '/mod/pdfannotator/model/pdfannotator.php');

    global $DB;
    $reportid = required_param('reportid', PARAM_INT);
    $openannotator = required_param('openannotator', PARAM_INT);

    if ($DB->update_record('pdfannotator_reports', array("id" => $reportid, "seen" => 0), $bulk = false)) {
        echo json_encode(['status' => 'success', 'reportid' => $reportid]);
    } else {
        echo json_encode(['status' => 'error']);
    }
}

/******************************************** 6. HANDLE PRINT REQUEST FOR ANNOTATIONS *******************************************/
/****************************************************************************************************************/

if ($action === 'getCommentsToPrint') {

    // Check capability and setting.
    if (!$pdfannotator->useprintcomments && !has_capability('mod/pdfannotator:printcomments', $context)) {
        echo json_encode(['status' => 'error']);
        return;
    }

    global $DB;

    // The model retrieves and selects data.
    $conversations = pdfannotator_instance::get_conversations($documentid, $context);

    if ($conversations === -1) { // Sth. went wrong with the database query.
        echo json_encode(['status' => 'error']);
        return;

    } else if (empty($conversations)) { // There are no comments that could be printed.
        echo json_encode(['status' => 'empty']);
        return;

    } else { // Everything is fine.
        $documentname = pdfannotator_get_instance_name($documentid);

        $posts = [];
        $count = 0;
        foreach ($conversations as $conversation) {
            $post = new stdClass();
            $post->rawAnsweredquestion = $conversation->answeredquestion;
            $post->answeredquestion = pdfannotator_handle_latex($context, $conversation->answeredquestion);
            $post->answeredquestion = pdfannotator_extract_images($post->answeredquestion, $conversation->id, $context);
            $post->page = $conversation->page;
            $post->annotationtypeid = $conversation->annotationtypeid;
            $post->author = $conversation->author;
            $post->id = $conversation->id;
            $post->timemodified = $conversation->timemodified;
            $post->answers = [];

            $answercount = 0;
            foreach ($conversation->answers as $ca) {
                $answer = new stdClass();
                $answer->rawAnswer = $ca->answer;
                $answer->answer = pdfannotator_handle_latex($context, $ca->answer);
                $answer->answer = pdfannotator_extract_images($answer->answer, $ca->id, $context);
                $answer->author = $ca->author;
                $answer->id = $ca->id;
                $answer->timemodified = $ca->timemodified;
                $post->answers[$answercount] = $answer;
                $answercount++;
            }

            $posts[$count] = $post;
            $count++;
        }

        $myrenderer = $PAGE->get_renderer('mod_pdfannotator');
        $templatable = new printview($documentname, $posts);
        $newdata = $templatable->export_for_template($myrenderer);// Viewcontroller takes model's data and arranges it for display.

        echo json_encode(['status' => 'success', 'pdfannotatorid' => $documentid, 'newdata' => $newdata]);
    }

}
