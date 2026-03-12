# Review Checklist

## Correctness

- Does the feature work for the intended input?
- Are edge cases handled explicitly?
- Are outputs structured and schema-compliant?

## Matching Logic

- Are hard constraints enforced deterministically?
- Is semantic matching evidence-backed?
- Can the score be explained dimension by dimension?

## Security

- Are secrets kept out of source code?
- Is candidate data exposure minimized?
- Are file uploads validated?
- Are sensitive logs redacted where needed?

## Reliability

- Are failures observable and recoverable?
- Are task states updated correctly?
- Is retry behavior safe?

## Testing

- Are core behaviors covered by tests?
- Is there a regression test for bug fixes?
- Are prompt/schema assumptions validated where practical?
