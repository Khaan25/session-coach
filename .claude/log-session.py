#!/usr/bin/env python3
"""
log-session.py — write a markdown log of a Claude Code session into .claude-logs/

Two ways to run:
  1. As a hook (Claude Code pipes JSON on stdin with transcript_path + cwd). .claude/settings.json runs it on
     UserPromptSubmit, Stop, SubagentStop and SessionEnd, so the log is current after every turn, not only when a
     session closes (a desktop session can stay open for days).
  2. Backfill past sessions that have no log yet:
         python3 .claude/log-session.py --backfill
     (add --force to regenerate logs that already exist)

It reads the session transcript(s) Claude Code stores under
~/.claude/projects/<encoded-cwd>/<session-uuid>.jsonl and writes one
<date>_<time>_<session-id>.md per session into <project>/.claude-logs/: each typed prompt,
the reply its turn ended on, and each subagent's brief and report. Tool calls,
their output and injected context are left out, and every line is redacted.

Author is stamped into each log's frontmatter. It is resolved, in order:
  1. the CLAUDE_LOG_AUTHOR environment variable, if set;
  2. the repo's `git config user.name` (spaces → dashes);
  3. "unknown".
So every engineer's logs are attributed automatically — nothing to edit per clone.

The template repository itself keeps no logs. When the root package.json is
still named "app-template" AND the origin remote is the template's own repo,
this script writes nothing, in hook mode and --backfill alike, and says so on
stderr. Any copy of the template has its own remote, so it logs from day one.
"""

import sys, os, re, json, glob, subprocess
from datetime import datetime, timezone

LONG_WORDS = 100  # a prompt longer than this counts as "long content"
# One pattern for the frontmatter count and the per-entry flag: a file name or a path.
PATH_RE = re.compile(r"\b[\w./-]+\.(tsx?|jsx?|py|json|md|s?css|html|sql|sh|ya?ml|toml)\b|\b\w[\w-]*/[\w./-]+")


def project_root():
    """Absolute path to the repo root (where .claude-logs/ belongs).

    Anchored to the project, never the live cwd: Claude Code may change its
    working directory mid-session, so we must not derive the log location from
    the payload cwd or os.getcwd(). Prefer $CLAUDE_PROJECT_DIR (set by Claude
    Code for hooks); fall back to this script's own location (.claude/ -> root).
    """
    env = os.environ.get("CLAUDE_PROJECT_DIR")
    if env and env.strip():
        return os.path.abspath(env.strip())
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


# ----------------------------- redaction -----------------------------
# Logs are committed, so every line passes through redact() before it is written. This is a safety net on top of
# scripts/check-secrets.mjs (the pre-commit scan), not permission to paste secrets. Personal data other than emails
# still needs a read before staging (docs/rules/secrets.md).

_SECRET_CHARS = r"[A-Za-z0-9_\-]"

REDACTIONS = [
    # Supabase keys (new format) and personal access tokens
    (re.compile(r"sb_(secret|publishable)_" + _SECRET_CHARS + r"{4,}"), r"sb_\1_[REDACTED]"),
    (re.compile(r"sbp_[A-Za-z0-9]{20,}"), "sbp_[REDACTED]"),
    # JWTs (Supabase legacy anon/service_role keys, session tokens)
    (re.compile(r"eyJ" + _SECRET_CHARS + r"{10,}\.eyJ" + _SECRET_CHARS + r"{10,}\." + _SECRET_CHARS + r"{10,}"),
     "[JWT REDACTED]"),
    # Model providers and email
    (re.compile(r"sk-ant-" + _SECRET_CHARS + r"{12,}"), "sk-ant-[REDACTED]"),
    (re.compile(r"sk-(?:proj-|live_|test_|or-v1-)" + _SECRET_CHARS + r"{12,}"), "sk-[REDACTED]"),
    (re.compile(r"\bgsk_[A-Za-z0-9]{20,}"), "gsk_[REDACTED]"),
    (re.compile(r"\bre_[A-Za-z0-9_]{20,}"), "re_[REDACTED]"),
    # CLI tokens this app issues
    (re.compile(r"\bsc_[A-Za-z0-9_\-]{20,}"), "sc_[REDACTED]"),
    # GitHub, AWS, Google, Slack
    (re.compile(r"\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}"), r"\1_[REDACTED]"),
    (re.compile(r"github_pat_[A-Za-z0-9_]{20,}"), "github_pat_[REDACTED]"),
    (re.compile(r"\bAKIA[0-9A-Z]{16}\b"), "AKIA[REDACTED]"),
    (re.compile(r"\bAIza[0-9A-Za-z_\-]{30,}"), "AIza[REDACTED]"),
    (re.compile(r"\bxox[baprs]-[A-Za-z0-9\-]{10,}"), "xox-[REDACTED]"),
    # Connection strings with embedded passwords
    (re.compile(r"((?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|rediss?|amqp)://[A-Za-z0-9._%\-]+:)[A-Za-z0-9._%+!$*#~\-]{4,}@"),
     r"\1[REDACTED]@"),
    # Authorization headers
    (re.compile(r"(?i)(bearer\s+)[A-Za-z0-9_\-.=]{16,}"), r"\1[REDACTED]"),
    # PEM private keys
    (re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----"), "[PRIVATE KEY REDACTED]"),
    # KEY=value lines whose name says secret and whose value looks real (not "...", "<ref>" or "${VAR}")
    (re.compile(
        r"(?im)^(\s*(?:export\s+)?[A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|PASSWD|API_KEY|APIKEY|PRIVATE_KEY"
        r"|ACCESS_KEY|CLIENT_SECRET|DATABASE_URL|SERVICE_ROLE)[A-Z0-9_]*\s*[=:]\s*[\"']?)"
        r"(?!\[REDACTED\])([A-Za-z0-9_\-+/=.:@]{12,})(?<!\.\.\.)([\"']?\s*(?:#.*)?)$"),
     r"\1[REDACTED]\3"),
    # "password": "..." literals in JSON, YAML and TS
    (re.compile(r"(?i)([\"']?(?:password|passwd|secret|token|api[_-]?key|client[_-]?secret)[\"']?\s*[:=]\s*[\"'])([^\"']{8,})([\"'])"),
     r"\1[REDACTED]\3"),
    # Email addresses other than GitHub noreply
    (re.compile(r"[A-Za-z0-9._%+\-]+@(?!users\.noreply\.github\.com\b)[A-Za-z0-9.\-]+\.[A-Za-z]{2,}"), "[email redacted]"),
]


def redact(text):
    """Mask credential-shaped strings and emails. Idempotent: redacted text redacts to itself."""
    for pattern, replacement in REDACTIONS:
        text = pattern.sub(replacement, text)
    return text


# ----------------------------- helpers -----------------------------

def parse_ts(s):
    """Transcript ISO timestamp to datetime; None when missing or malformed, so one bad line never kills the log."""
    if not s:
        return None
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except Exception:
        return None

def to_local(dt):
    """Shift to the machine's time zone, so file names and times match the author's clock."""
    return dt.astimezone() if dt else None

def text_from_content(content):
    """Return concatenated text of a message, or None if it carries no real text
    (e.g. a pure tool_result / tool_use payload)."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts, has_tool_result = [], False
        for it in content:
            if isinstance(it, dict):
                t = it.get("type")
                if t == "text":
                    parts.append(it.get("text", ""))
                elif t == "tool_result":
                    has_tool_result = True
        if parts:
            return "\n".join(parts)
        if has_tool_result:
            return None
    return None

# Context the IDE and harness attach to a prompt; nobody typed it.
INJECTED_BLOCKS = re.compile(r"<(ide_opened_file|ide_selection|system-reminder)>[\s\S]*?</\1>\s*")
# Harness events delivered as user turns: slash-command echoes, task and session notifications.
HARNESS_PREFIXES = ("<command-name>", "<command-message>", "<local-command", "Caveat:", "<task-notification>",
                    "<side-sessions-event>", "<ci-monitor-event>", "Another Claude session sent a message",
                    "This session is being continued from a previous conversation")


def is_harness_event(txt):
    """True for a notification the harness delivered as a user turn; some carry a preamble before their tag."""
    return txt.startswith(HARNESS_PREFIXES) or "<task-notification>" in txt


def prompt_text(o):
    """The text a person typed, or None for tool results, subagent and meta turns, and harness events."""
    if o.get("isSidechain") or o.get("isMeta") or o.get("type") != "user":
        return None
    m = o.get("message")
    if not isinstance(m, dict):
        return None
    c = m.get("content")
    if isinstance(c, list):
        types = [it.get("type") for it in c if isinstance(it, dict)]
        if "tool_result" in types or "text" not in types:
            return None
    txt = INJECTED_BLOCKS.sub("", text_from_content(c) or "").strip()
    if not txt or is_harness_event(txt):
        return None
    return txt


def author_for(cwd):
    """Resolve the log author: env override → git user.name → 'unknown'."""
    env = os.environ.get("CLAUDE_LOG_AUTHOR")
    if env and env.strip():
        return env.strip().replace(" ", "-")
    try:
        out = subprocess.run(
            ["git", "config", "user.name"],
            cwd=cwd, capture_output=True, text=True, timeout=3,
        )
        name = (out.stdout or "").strip()
        if name:
            return name.replace(" ", "-")
    except Exception:
        pass
    return "unknown"


def git_config(cwd, key):
    """A git config value, or "" when unset or git is missing."""
    try:
        out = subprocess.run(["git", "config", key], cwd=cwd, capture_output=True, text=True, timeout=3)
        return (out.stdout or "").strip()
    except Exception:
        return ""


def git_config_path(root):
    """Absolute path of the repository's shared .git directory, or "" outside git."""
    try:
        out = subprocess.run(["git", "rev-parse", "--path-format=absolute", "--git-common-dir"],
                             cwd=root, capture_output=True, text=True, timeout=3)
        return (out.stdout or "").strip()
    except Exception:
        return ""


def masked_email(email):
    """GitHub noreply addresses are public already; any other address keeps only its first letter and domain."""
    if not email or "@" not in email or email.endswith("@users.noreply.github.com"):
        return email or "unknown"
    local, domain = email.split("@", 1)
    return f"{local[:1]}***@{domain}"


def github_user_for(cwd):
    """GitHub login: $GITHUB_USER, else the login in a noreply commit email, else the active `gh` account.

    `gh` is last because someone signed in to several accounts would otherwise have the session credited to
    whichever is active, and these logs are public.
    """
    env = os.environ.get("GITHUB_USER", "").strip()
    if env:
        return env
    m = re.match(r"^(?:\d+\+)?([A-Za-z0-9-]+)@users\.noreply\.github\.com$", git_config(cwd, "user.email"))
    if m:
        return m.group(1)
    try:
        out = subprocess.run(["gh", "api", "user", "--jq", ".login"], capture_output=True, text=True, timeout=5)
        return (out.stdout or "").strip() or "unknown"
    except Exception:
        return "unknown"


# ----------------------------- transcript -> exchanges -----------------------------

def read_exchanges(path):
    """Parse a transcript JSONL into a list of {prompt, prts(raw), resp[final reply], rts(raw)} exchanges."""
    exchanges, current = [], None
    with open(path, "r", encoding="utf-8", errors="replace") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                o = json.loads(line)
            except Exception:
                continue
            if o.get("isSidechain"):
                continue
            t = o.get("type")
            txt = prompt_text(o) if t == "user" else None
            if txt:
                current = {"prompt": txt, "prts": o.get("timestamp"),
                           "resp": [], "rts": None}
                exchanges.append(current)
            elif t == "assistant" and current is not None:
                m = o.get("message", {})
                txt = text_from_content(m.get("content") if isinstance(m, dict) else None)
                if txt and txt.strip():
                    # Only the reply the turn ends on: the narration between tool calls is work, not the answer.
                    current["resp"] = [txt.strip()]
                    # Last reply time, so duration and the filename cover the assistant's work.
                    current["rts"] = o.get("timestamp") or current["rts"]
    return exchanges


def read_subagent(path):
    """A subagent's prompts (the brief, then any follow-ups) and its replies, as (role, timestamp, text) tuples.

    A reply is the report handed back through SubagentHandback, or plain text for agents that answer directly.
    """
    entries = []
    with open(path, "r", encoding="utf-8", errors="replace") as fh:
        for line in fh:
            try:
                o = json.loads(line)
            except Exception:
                continue
            ts = o.get("timestamp")
            c = (o.get("message") or {}).get("content") if isinstance(o.get("message"), dict) else None
            if o.get("type") == "user" and isinstance(c, str):
                txt = INJECTED_BLOCKS.sub("", c).strip()
                if txt and not is_harness_event(txt):
                    entries.append(("prompt", ts, txt))
            elif o.get("type") == "assistant" and isinstance(c, list):
                texts = []
                for b in c:
                    if not isinstance(b, dict):
                        continue
                    if b.get("type") == "tool_use" and b.get("name") == "SubagentHandback":
                        texts.append(str((b.get("input") or {}).get("message", "")).strip())
                    elif b.get("type") == "text":
                        texts.append(b.get("text", "").strip())
                txt = "\n\n".join(t for t in texts if t)
                if not txt:
                    continue
                # Keep only the last reply before each prompt, as for the main session.
                if entries and entries[-1][0] == "reply":
                    entries[-1] = ("reply", ts, txt)
                else:
                    entries.append(("reply", ts, txt))
    return entries


def subagent_sections(transcript_path, session_id):
    """Markdown for each subagent of the session (in <session>/subagents/ beside the transcript), oldest first."""
    sub_dir = os.path.join(os.path.splitext(transcript_path)[0], "subagents")
    agents = []
    for path in glob.glob(os.path.join(sub_dir, "agent-*.jsonl")):
        entries = read_subagent(path)
        if entries:
            agents.append((entries[0][1] or "", path, entries))
    out = []
    for _, path, entries in sorted(agents, key=lambda a: a[0]):
        agent_id = os.path.splitext(os.path.basename(path))[0].removeprefix("agent-")
        try:
            with open(os.path.splitext(path)[0] + ".meta.json", encoding="utf-8") as fh:
                meta = json.load(fh)
        except Exception:
            meta = {}
        out += ["", f"## Subagent: {meta.get('description') or agent_id}", "",
                f"agent_id: {agent_id} | type: {meta.get('agentType', 'unknown')}"]
        num = 0
        for role, ts, txt in entries:
            num += role == "prompt"
            kind = "SUBAGENT_PROMPT" if role == "prompt" else "SUBAGENT_RESPONSE"
            out += ["", f"[CLAUDE_LOG_ENTRY type={kind} num={num} session={session_id} agent={agent_id}]",
                    f"timestamp: {ts}", f"chars: {len(txt)}", "", txt, ""]
    return out


def build_log(exchanges, session_id, cwd, subagents=()):
    """Return (filename, markdown_text) for a parsed session, or (None, None) if empty."""
    if not exchanges:
        return None, None

    # The repo's name, not a worktree's: a worktree's .git points back to the main checkout's .git.
    common = git_config_path(project_root())
    project = os.path.basename(os.path.dirname(common) if common else project_root().rstrip("/")) or "unknown"
    author = author_for(cwd)
    github_user = github_user_for(cwd)
    git_email = masked_email(git_config(cwd, "user.email"))

    def words(s):
        return len(s.split())

    prompts = [e["prompt"] for e in exchanges]
    responses = ["\n\n".join(e["resp"]) for e in exchanges]

    p_chars = [len(p) for p in prompts]
    p_words = [words(p) for p in prompts]
    r_chars = [len(r) for r in responses if r]

    total_p_chars, total_p_words = sum(p_chars), sum(p_words)
    total_r_chars = sum(r_chars)
    n = len(prompts)

    code = sum(1 for p in prompts if "```" in p)
    paths = sum(1 for p in prompts if PATH_RE.search(p))
    urls = sum(1 for p in prompts if re.search(r"https?://", p))
    long_c = sum(1 for p in prompts if words(p) > LONG_WORDS)
    pasted = sum(1 for p in prompts if words(p) > LONG_WORDS and "\n" in p)

    first_pts, last_pts = exchanges[0]["prts"], exchanges[-1]["prts"]
    fdt, ldt = parse_ts(first_pts), parse_ts(last_pts)
    end_ts = exchanges[-1]["rts"] or last_pts
    edt = parse_ts(end_ts) or ldt
    dur = round((edt - fdt).total_seconds() / 60.0, 1) if (fdt and edt) else 0.0
    last_type = "assistant" if exchanges[-1]["resp"] else "user"

    # filename / date come from the session's last local activity
    end_local = to_local(parse_ts(exchanges[-1]["rts"] or last_pts)) or datetime.now().astimezone()
    fname = f"{end_local.strftime('%Y-%m-%d_%H-%M-%S')}_{session_id}.md"
    date_str = end_local.strftime("%Y-%m-%d")

    def ratio(a, b):
        return round(a / b, 2) if b else 0.0

    fm = [
        ("session_id", session_id),
        ("date", date_str),
        ("author", author),
        ("github_user", github_user),
        ("git_email", git_email),
        ("project", project),
        ("session_status", "complete"),
        ("last_entry_type", last_type),
        ("total_exchanges", n),
        ("generated_at", datetime.now().isoformat()),
        ("first_prompt_time", first_pts),
        ("last_prompt_time", last_pts),
        ("session_duration_minutes", dur),
        ("total_prompt_chars", total_p_chars),
        ("total_prompt_words", total_p_words),
        ("avg_prompt_length_chars", round(total_p_chars / n, 1)),
        ("avg_prompt_length_words", round(total_p_words / n, 1)),
        ("longest_prompt_words", max(p_words) if p_words else 0),
        ("shortest_prompt_words", min(p_words) if p_words else 0),
        ("total_response_chars", total_r_chars),
        ("avg_response_length_chars", round(total_r_chars / n, 1)),
        ("response_to_prompt_ratio", ratio(total_r_chars, total_p_chars)),
        ("prompts_with_code_blocks", code),
        ("prompts_with_file_paths", paths),
        ("prompts_with_urls", urls),
        ("prompts_with_long_content", long_c),
        ("likely_pasted_count", pasted),
    ]

    out = ["---"]
    out += [f"{k}: {v}" for k, v in fm]
    out += ["---", "", f"# Claude Session Log - {date_str}", "",
            f"Session: `{session_id}` | Project: `{project}` | Author: `{author}` | GitHub: `{github_user}`", "", "---", ""]

    path_re = PATH_RE
    url_re = re.compile(r"https?://")
    for i, e in enumerate(exchanges, 1):
        p = e["prompt"]
        pdt = to_local(parse_ts(e["prts"]))
        has_code = "```" in p
        has_paths = bool(path_re.search(p))
        has_urls = bool(url_re.search(p))
        is_pasted = words(p) > LONG_WORDS and "\n" in p
        out += ["",
                f"[CLAUDE_LOG_ENTRY type=PROMPT num={i} session={session_id}]",
                f"timestamp: {e['prts']}",
                f"time: {pdt.strftime('%Y-%m-%d %H:%M') if pdt else ''}",
                f"chars: {len(p)}",
                f"words: {words(p)}",
                f"has_code_block: {has_code}",
                f"has_file_paths: {has_paths}",
                f"has_urls: {has_urls}",
                f"likely_pasted: {is_pasted}",
                "", p, ""]
        r = "\n\n".join(e["resp"])
        if r:
            rdt = to_local(parse_ts(e["rts"]))
            out += ["",
                    f"[CLAUDE_LOG_ENTRY type=RESPONSE num={i} session={session_id}]",
                    f"timestamp: {e['rts']}",
                    f"time: {rdt.strftime('%Y-%m-%d %H:%M') if rdt else ''}",
                    f"chars: {len(r)}",
                    "", r, ""]

    if subagents:
        out += ["", "---", "", "# Subagents", "",
                "The brief each subagent was sent and the report it handed back, oldest first."]
        out += list(subagents)

    return fname, redact("\n".join(out) + "\n")


def write_session(transcript_path, cwd, session_id=None, force=False):
    """Write one session's log into .claude-logs/ and return its path.

    Returns None when the session has no prompts, or when a log exists and force is off.
    With force, the new log replaces the old one even if its timestamped name changed.
    """
    session_id = session_id or os.path.splitext(os.path.basename(transcript_path))[0]
    exchanges = read_exchanges(transcript_path)
    fname, text = build_log(exchanges, session_id, cwd,
                            subagent_sections(transcript_path, session_id))
    if not fname:
        return None
    outdir = os.path.join(project_root(), ".claude-logs")
    os.makedirs(outdir, exist_ok=True)
    # Logs written before names carried the full session ID end in its first 8 characters; replace those too.
    existing = glob.glob(os.path.join(outdir, f"*_{session_id}.md")) + glob.glob(os.path.join(outdir, f"*_{session_id[:8]}.md"))
    if existing and not force:
        return None  # already logged (backfill skips)
    # Write to a temp file and swap it in, so a failed write cannot leave a
    # 0-byte log behind. Only drop the session's older log once the new one is
    # safely on disk -- deleting first meant a failed write lost both.
    path = os.path.join(outdir, fname)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(text)
    os.replace(tmp, path)
    for old in existing:
        if os.path.abspath(old) != os.path.abspath(path):
            try:
                os.remove(old)
            except OSError:
                pass
    return path


# ----------------------------- entry points -----------------------------

def encoded_project_dir(cwd):
    # Claude Code encodes the project path by replacing separators with "-".
    # On Windows the cwd is C:\Users\me\Repo, so the backslashes and the drive
    # colon have to go too -- otherwise the computed folder never exists, the
    # glob matches nothing, and --backfill reports success having done nothing.
    enc = cwd.replace("\\", "-").replace("/", "-").replace(":", "-").replace(".", "-")
    return os.path.join(os.path.expanduser("~/.claude/projects"), enc)

def backfill(cwd, force=False):
    """Attempt to write logs for this project's stored transcripts, oldest first.

    Existing logs are skipped unless force is true; returns paths successfully written.
    """
    proj = encoded_project_dir(cwd)
    made = []
    for tp in sorted(glob.glob(os.path.join(proj, "*.jsonl")), key=os.path.getmtime):
        try:
            p = write_session(tp, cwd, force=force)
            if p:
                made.append(p)
        except Exception as e:
            print(f"  skip {os.path.basename(tp)}: {e}", file=sys.stderr)
    return made

TEMPLATE_PACKAGE_NAME = "app-template"


TEMPLATE_REMOTE = re.compile(r"github\.com[:/]8xsocial/template-monorepo(\.git)?/?$", re.IGNORECASE)


def is_template_repo():
    """True when this checkout is the template itself, not a play cloned from it.

    Both have to hold: the root package.json still has the template's name, and
    the `origin` remote is the template's own repository. A copy made with "Use
    this template" has its own remote, so it logs from its first session even
    before anyone renames the package. Anything unreadable counts as a play:
    logging stays on unless the template is positively identified.
    """
    try:
        with open(os.path.join(project_root(), "package.json"), encoding="utf-8") as fh:
            if json.load(fh).get("name") != TEMPLATE_PACKAGE_NAME:
                return False
        remote = subprocess.run(
            ["git", "-C", project_root(), "remote", "get-url", "origin"],
            capture_output=True, text=True, timeout=5,
        ).stdout.strip()
        return bool(TEMPLATE_REMOTE.search(remote))
    except Exception:
        return False


def main():
    """Hook mode by default, --backfill for past sessions. Exits 0 on normal paths so it never blocks Claude Code."""
    if is_template_repo():
        print(
            f"log-session: not writing a session log: this is the template repository "
            f"itself (package \"{TEMPLATE_PACKAGE_NAME}\", origin is the template's repo).",
            file=sys.stderr,
        )
        sys.exit(0)

    force = "--force" in sys.argv
    if "--backfill" in sys.argv:
        cwd = project_root()
        made = backfill(cwd, force=force)
        print(f"Backfill complete: wrote {len(made)} log(s) to {os.path.join(cwd, '.claude-logs')}")
        for m in made:
            print("  +", os.path.basename(m))
        return

    # hook mode: Claude Code pipes JSON on stdin
    raw = sys.stdin.read() if not sys.stdin.isatty() else ""
    data = {}
    if raw.strip():
        try:
            data = json.loads(raw)
        except Exception:
            pass
    tp = data.get("transcript_path")
    cwd = data.get("cwd") or os.getcwd()
    sid = data.get("session_id")
    if not tp or not os.path.exists(tp):
        sys.exit(0)  # nothing to log, exit quietly
    try:
        write_session(tp, cwd, session_id=sid, force=True)
    except Exception as e:
        print(f"log-session: {e}", file=sys.stderr)
    sys.exit(0)

if __name__ == "__main__":
    main()
