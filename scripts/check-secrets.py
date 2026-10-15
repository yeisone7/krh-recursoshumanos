"""Check tracked files without printing credential values. Run from the repo root."""
import base64
import json
from pathlib import Path
import re
import subprocess
import sys


PATTERNS = {
    "Supabase access token": re.compile(r"\bsbp_[a-fA-F0-9]{32,}\b"),
    "Supabase secret key": re.compile(r"\bsb_secret_[A-Za-z0-9_-]{16,}\b"),
    "Resend API key": re.compile(r"\bre_[A-Za-z0-9_]{24,}\b"),
    "private key": re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    "GitHub token": re.compile(r"\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b"),
    "AWS access key": re.compile(r"\b(?:AKIA|ASIA)[A-Z0-9]{16}\b"),
    "Google API key": re.compile(r"\bAIza[A-Za-z0-9_-]{35}\b"),
    "OpenAI or Stripe secret key": re.compile(r"\b(?:sk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{32,}|sk_(?:live|test)_[A-Za-z0-9]{20,})\b"),
    "database connection password": re.compile(r"(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?)://[^\s:/]+:[^\s@/]{8,}@", re.I),
    "hardcoded registration token": re.compile(r"\btokenParam\s*=\s*[\"'][A-Za-z0-9_-]{24,}[\"']"),
}
JWT = re.compile(r"\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+")


def findings(path, content):
    name = Path(path).name
    if name.startswith(".env") and not name.endswith(".example"):
        yield 1, "tracked environment file"
    for line_number, line in enumerate(content.splitlines(), 1):
        for label, pattern in PATTERNS.items():
            if pattern.search(line):
                yield line_number, label
        for match in JWT.finditer(line):
            try:
                payload = json.loads(base64.urlsafe_b64decode(match[0].split(".")[1] + "==="))
            except (ValueError, UnicodeError):
                continue
            if isinstance(payload, dict) and payload.get("role") == "service_role":
                yield line_number, "Supabase service_role JWT"


def main():
    root = Path(subprocess.check_output(["git", "rev-parse", "--show-toplevel"], text=True).strip())
    paths = subprocess.check_output(["git", "ls-files", "-z"], cwd=root).decode("utf-8").split("\0")
    failed = False
    for path in filter(None, paths):
        file = root / path
        if not file.is_file():
            continue
        try:
            content = file.read_bytes().decode("utf-8")
        except UnicodeError:
            content = ""
        for line, label in findings(path, content):
            print(f"{path}:{line}: {label} (value redacted)")
            failed = True
    print("Secret check failed." if failed else "No supported secret patterns or environment files found in tracked files.")
    return int(failed)


if __name__ == "__main__":
    sys.exit(main())
