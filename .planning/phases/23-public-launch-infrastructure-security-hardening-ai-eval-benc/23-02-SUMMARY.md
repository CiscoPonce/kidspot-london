# Plan 23-02: Offsite Cloudflare R2 Disaster Recovery Sync

## Overview
This plan enhances the existing daily PostgreSQL backup script (`scripts/backup.sh`) to support offsite disaster recovery synchronization to a Cloudflare R2 bucket.

## Changes Made
- Added a check for Cloudflare R2 environment variables (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`).
- If these variables are present, the script now uses the `aws` CLI with the custom R2 S3 API endpoint to upload the generated `.dump` file to the specified bucket.
- Updated the local retention management to delete local backups older than 30 days instead of 7 days.
- Added automated retention management to query and delete backups older than 30 days from the Cloudflare R2 bucket as well.

The changes successfully support Cloudflare R2 backup automation and offsite disaster recovery workflows.
