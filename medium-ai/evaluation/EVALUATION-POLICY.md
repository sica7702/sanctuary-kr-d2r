# Independent evaluation v1

Evaluation rows must come from the immutable holdout split and must not be used for training, prompt construction, or model selection before the report is frozen.

The first gates are deliberately conservative: at least 100 holdout cases, false approval below 2%, and text/image mismatch below 5%. These are promotion gates, not claims that the current system already passes them.
