import re
import sys


def normalize_payload(payload: str) -> str:
    lines = []
    for raw in payload.replace("\r\n", "\n").replace("\r", "\n").split("\n"):
        line = raw
        if line.startswith("> "):
            line = line[2:]
        if line.startswith("    diff --git ") or line.startswith("\tdiff --git "):
            line = line.lstrip()
        lines.append(line)

    start = next((i for i, line in enumerate(lines) if line.startswith("diff --git ")), None)
    if start is None:
        return ""
    return "\n".join(lines[start:]).strip()


def extract_diff_from_text(source: str) -> str:
    fenced_blocks = re.findall(r"```[^\n]*\n(.*?)\n```", source, flags=re.S)
    for block in fenced_blocks:
        if "diff --git " in block:
            return block

    idx = source.find("diff --git ")
    if idx >= 0:
        return source[idx:]
    return ""


def main() -> int:
    if len(sys.argv) < 3:
        print("Usage: openrouter_extract_patch.py <report_path> <patch_path>")
        return 1

    report_path = sys.argv[1]
    patch_path = sys.argv[2]
    text = open(report_path, "r", encoding="utf-8", errors="ignore").read()
    lowered = text.lower()

    marker = lowered.find("## proposed patch")
    scope = text[marker:] if marker >= 0 else text
    if marker >= 0:
        print(f"✓ Found Proposed Patch section at position {marker}")
    else:
        print("⚠️ Proposed Patch heading not found; scanning full report for diff")

    payload = extract_diff_from_text(scope)
    if not payload and scope is not text:
        payload = extract_diff_from_text(text)

    if not payload:
        meaningful = [line.strip() for line in scope.splitlines() if line.strip()]
        if any(line.upper() == "NO_PATCH" for line in meaningful):
            print("⚠️ Model returned NO_PATCH")
            open(patch_path, "w", encoding="utf-8").write("NO_PATCH\n")
            return 0

        print("❌ ERROR: No diff block found in report")
        print(f"Report preview (first 800 chars):\n{text[:800]}")
        open(patch_path, "w", encoding="utf-8").write("")
        return 0

    normalized = normalize_payload(payload)
    if not normalized:
        print("❌ ERROR: Found patch-like content, but no valid 'diff --git' header after normalization")
        print(f"Payload preview (first 500 chars):\n{payload[:500]}")
        open(patch_path, "w", encoding="utf-8").write("")
        return 0

    open(patch_path, "w", encoding="utf-8").write(normalized + "\n")
    print(f"✓ Normalized patch: {len(normalized)} bytes")
    first_line = normalized.splitlines()[0] if normalized else "EMPTY"
    print("✓ First line:", first_line)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
