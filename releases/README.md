# Artifact policy

Build outputs live in ignored artifacts/ and are published only after verification. See release-manifest.json and SHA256SUMS.txt on each actual GitHub release for exact files, byte sizes and hashes. Native source does not count as a binary; unsigned APK candidates and simulator builds are not signed distribution artifacts. See [build and signing guide](../docs/RELEASE_AND_SIGNING.md) and [verification evidence](../docs/VERIFICATION.md).
