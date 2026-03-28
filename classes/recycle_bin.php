<?php
// This file is part of Moodle mod_pdfannotator recycle bin (Phase C).
//
// @package   mod_pdfannotator

namespace mod_pdfannotator;

defined("MOODLE_INTERNAL") || die();

class recycle_bin {

    const MAX_ITEMS = 10;

    public static function insert_entry(int $actorid, \stdClass $cm, string $itemtype, array $payload): void {
        global $DB;
        $rec = new \stdClass();
        $rec->userid = $actorid;
        $rec->pdfannotatorid = (int) $cm->instance;
        $rec->courseid = (int) $cm->course;
        $rec->cmid = (int) $cm->id;
        $rec->itemtype = $itemtype;
        $rec->payload = json_encode($payload, JSON_UNESCAPED_UNICODE);
        $rec->timecreated = time();
        $DB->insert_record("pdfannotator_recycle", $rec);
        self::enforce_limit((int) $cm->instance, $actorid);
    }

    public static function enforce_limit(int $pdfannotatorid, int $actorid): void {
        global $DB;
        $records = $DB->get_records_select(
            "pdfannotator_recycle",
            "pdfannotatorid = ? AND userid = ?",
            [$pdfannotatorid, $actorid],
            "id DESC",
            "id"
        );
        $ids = array_keys($records);
        if (count($ids) <= self::MAX_ITEMS) {
            return;
        }
        $to_delete = array_slice($ids, self::MAX_ITEMS);
        $DB->delete_records_list("pdfannotator_recycle", "id", $to_delete);
    }

    public static function snapshot_annotation_deletion(int $actorid, \stdClass $cm, \stdClass $annotation): void {
        global $DB;
        try {
            $comments = $DB->get_records("pdfannotator_comments", ["annotationid" => $annotation->id]);
            $votes = [];
            foreach ($comments as $c) {
                foreach ($DB->get_records("pdfannotator_votes", ["commentid" => $c->id]) as $v) {
                    $votes[] = (array) $v;
                }
            }
            $subs = $DB->get_records("pdfannotator_subscriptions", ["annotationid" => $annotation->id]);
            $payload = [
                "v" => 1,
                "annotation" => (array) $annotation,
                "comments" => array_map(static function($x) { return (array) $x; }, $comments),
                "votes" => $votes,
                "subscriptions" => array_map(static function($x) { return (array) $x; }, $subs),
            ];
            self::insert_entry($actorid, $cm, "annotation", $payload);
        } catch (\Throwable $e) {
            debugging("pdfannotator recycle annotation: " . $e->getMessage(), DEBUG_DEVELOPER);
        }
    }

    public static function snapshot_comment_deletion(int $actorid, \stdClass $cm, array $commentrows): void {
        if (empty($commentrows)) {
            return;
        }
        global $DB;
        try {
            $votes = [];
            $norm = [];
            foreach ($commentrows as $c) {
                $row = is_array($c) ? $c : (array) $c;
                $norm[] = $row;
                $cid = (int) ($row["id"] ?? 0);
                if ($cid > 0) {
                    foreach ($DB->get_records("pdfannotator_votes", ["commentid" => $cid]) as $v) {
                        $votes[] = (array) $v;
                    }
                }
            }
            $payload = [
                "v" => 1,
                "annotationid" => (int) ($norm[0]["annotationid"] ?? 0),
                "pdfannotatorid" => (int) ($norm[0]["pdfannotatorid"] ?? 0),
                "comments" => $norm,
                "votes" => $votes,
            ];
            self::insert_entry($actorid, $cm, "comment", $payload);
        } catch (\Throwable $e) {
            debugging("pdfannotator recycle comment: " . $e->getMessage(), DEBUG_DEVELOPER);
        }
    }

    public static function list_for_user(int $pdfannotatorid, \context_module $context, int $userid): array {
        global $DB;
        $deleteany = has_capability("mod/pdfannotator:deleteany", $context);
        if ($deleteany) {
            $records = $DB->get_records_select(
                "pdfannotator_recycle",
                "pdfannotatorid = ?",
                [$pdfannotatorid],
                "id DESC"
            );
        } else {
            $records = $DB->get_records_select(
                "pdfannotator_recycle",
                "pdfannotatorid = ? AND userid = ?",
                [$pdfannotatorid, $userid],
                "id DESC"
            );
        }
        $out = [];
        foreach ($records as $r) {
            if (count($out) >= self::MAX_ITEMS) {
                break;
            }
            $payload = json_decode($r->payload, true);
            if (!is_array($payload)) {
                $payload = [];
            }
            $out[] = [
                "serverId" => (int) $r->id,
                "itemtype" => $r->itemtype,
                "timecreated" => (int) $r->timecreated,
                "actorid" => (int) $r->userid,
                "label" => self::make_label($r->itemtype, $payload),
            ];
        }
        return $out;
    }

    protected static function make_label(string $itemtype, array $payload): string {
        if ($itemtype === "annotation") {
            $ann = $payload["annotation"] ?? [];
            $page = (int) ($ann["page"] ?? 1);
            $type = "area";
            if (!empty($ann["data"])) {
                $d = json_decode($ann["data"], true);
                if (is_array($d) && !empty($d["type"])) {
                    $type = (string) $d["type"];
                }
            }
            return get_string("recycle_label_annotation", "pdfannotator", (object)["type" => $type, "page" => $page]);
        }
        $cnt = isset($payload["comments"]) ? count($payload["comments"]) : 1;
        return get_string("recycle_label_comment", "pdfannotator", (object)["count" => max(1, $cnt)]);
    }

    public static function restore(int $entryid, int $pdfannotatorid, \context_module $context): array {
        global $DB, $USER;
        $entry = $DB->get_record("pdfannotator_recycle", ["id" => $entryid], "*", IGNORE_MISSING);
        if (!$entry || (int) $entry->pdfannotatorid !== (int) $pdfannotatorid) {
            return ["status" => "error", "errorcode" => "notfound"];
        }
        $deleteany = has_capability("mod/pdfannotator:deleteany", $context);
        if (!$deleteany && (int) $entry->userid !== (int) $USER->id) {
            return ["status" => "error", "errorcode" => "nopermission"];
        }
        $payload = json_decode($entry->payload, true);
        if (!is_array($payload) || empty($payload["v"])) {
            return ["status" => "error", "errorcode" => "badpayload"];
        }
        try {
            if ($entry->itemtype === "annotation") {
                $page = (int) (($payload["annotation"]["page"] ?? 1));
                $newid = self::restore_annotation_bundle($payload);
                $DB->delete_records("pdfannotator_recycle", ["id" => $entryid]);
                return ["status" => "success", "annotationId" => $newid, "pageNumber" => $page];
            }
            if ($entry->itemtype === "comment") {
                $annid = self::restore_comment_bundle($payload);
                $DB->delete_records("pdfannotator_recycle", ["id" => $entryid]);
                return ["status" => "success", "reloadCommentsFor" => $annid];
            }
        } catch (\Throwable $e) {
            debugging("pdfannotator restore: " . $e->getMessage(), DEBUG_DEVELOPER);
            return ["status" => "error", "errorcode" => "restorefailed"];
        }
        return ["status" => "error", "errorcode" => "unknown"];
    }

    protected static function restore_annotation_bundle(array $payload): int {
        global $DB;
        $pdfann = $payload["annotation"];
        if (!is_array($pdfann)) {
            throw new \invalid_parameter_exception("annotation payload");
        }
        $pdfannotatorid = (int) ($pdfann["pdfannotatorid"] ?? 0);
        unset($pdfann["id"]);
        $newaid = $DB->insert_record("pdfannotator_annotations", (object) $pdfann);
        $oldtonew = [];
        $comments = $payload["comments"] ?? [];
        self::insert_comments_remapped($comments, (int) $newaid, $pdfannotatorid, $oldtonew);
        foreach ($payload["votes"] ?? [] as $va) {
            if (!is_array($va)) { continue; }
            $ocid = (int) ($va["commentid"] ?? 0);
            if ($ocid && isset($oldtonew[$ocid])) {
                unset($va["id"]);
                $va["commentid"] = $oldtonew[$ocid];
                $DB->insert_record("pdfannotator_votes", (object) $va);
            }
        }
        foreach ($payload["subscriptions"] ?? [] as $sa) {
            if (!is_array($sa)) { continue; }
            unset($sa["id"]);
            $sa["annotationid"] = (int) $newaid;
            $DB->insert_record("pdfannotator_subscriptions", (object) $sa);
        }
        return (int) $newaid;
    }

    protected static function restore_comment_bundle(array $payload): int {
        global $DB;
        $annid = (int) ($payload["annotationid"] ?? 0);
        if (!$DB->record_exists("pdfannotator_annotations", ["id" => $annid])) {
            throw new \invalid_parameter_exception("missing annotation");
        }
        $pdfid = (int) ($payload["pdfannotatorid"] ?? 0);
        $oldtonew = [];
        self::insert_comments_remapped($payload["comments"] ?? [], $annid, $pdfid, $oldtonew);
        foreach ($payload["votes"] ?? [] as $va) {
            if (!is_array($va)) { continue; }
            $ocid = (int) ($va["commentid"] ?? 0);
            if ($ocid && isset($oldtonew[$ocid])) {
                unset($va["id"]);
                $va["commentid"] = $oldtonew[$ocid];
                $DB->insert_record("pdfannotator_votes", (object) $va);
            }
        }
        return $annid;
    }

    protected static function insert_comments_remapped(array $comments, int $annotationid, int $pdfannotatorid, array &$oldtonew): void {
        global $DB;
        if (empty($comments)) { return; }
        $byold = [];
        foreach ($comments as $c) {
            if (!is_array($c)) { continue; }
            $oid = (int) ($c["id"] ?? 0);
            if ($oid) { $byold[$oid] = $c; }
        }
        $remaining = array_keys($byold);
        $safety = 0;
        while (!empty($remaining) && $safety < 500) {
            $safety++;
            $made = false;
            foreach ($remaining as $idx => $oid) {
                $c = $byold[$oid];
                $pid = isset($c["parentid"]) && $c["parentid"] !== null && $c["parentid"] !== "" ? (int) $c["parentid"] : 0;
                if ($pid > 0 && !isset($oldtonew[$pid]) && isset($byold[$pid])) { continue; }
                $row = self::build_comment_insert($c, $annotationid, $pdfannotatorid, $oldtonew, $pid);
                $newid = $DB->insert_record("pdfannotator_comments", $row);
                $oldtonew[$oid] = $newid;
                unset($remaining[$idx]);
                $made = true;
            }
            if (!$made) { break; }
        }
    }

    protected static function build_comment_insert(array $c, int $annotationid, int $pdfannotatorid, array $oldtonew, int $pid): \stdClass {
        unset($c["id"]);
        $c["annotationid"] = $annotationid;
        $c["pdfannotatorid"] = $pdfannotatorid;
        if ($pid > 0 && isset($oldtonew[$pid])) {
            $c["parentid"] = $oldtonew[$pid];
        } else {
            $c["parentid"] = null;
        }
        $c["isdeleted"] = 0;
        if (!array_key_exists("ishidden", $c)) { $c["ishidden"] = 0; }
        $now = time();
        $c["timemodified"] = $now;
        if (empty($c["timecreated"])) { $c["timecreated"] = $now; }
        return (object) $c;
    }
}
