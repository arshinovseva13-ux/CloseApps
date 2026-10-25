# secure-builder — acceptance test scenarios

1. **Primary task:** Review form/API code for injection, authorization gaps, secrets, and unsafe uploads; test malformed input and report evidence.
2. **Edge cases:** Check relevant failure states and boundary conditions.
3. **Evidence:** Report exact commands/checks actually run; mark unavailable checks NOT VERIFIED.
4. **Integrity:** Do not invent metrics, successful tests, or deployment status.
