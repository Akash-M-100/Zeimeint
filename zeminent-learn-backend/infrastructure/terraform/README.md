# Video storage infrastructure (Terraform)

Provisions the AWS resources that back Zeminent LMS video storage:

- **S3** — a private bucket for video objects (versioned, SSE-S3, all public access blocked,
  CORS for browser uploads, incomplete multipart uploads aborted after 7 days).
- **CloudFront** — CDN in front of the bucket via Origin Access Control (OAC), with a
  **trusted key group** so the backend can serve content through **signed URLs**.
- **IAM** — a least-privilege user (PutObject / GetObject / DeleteObject on the bucket only)
  whose access keys the backend uses.

## Prerequisites

- Terraform **>= 1.6**
- AWS credentials with permission to create the above (e.g. `aws configure`, an AWS profile,
  or `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` env vars).

## Run

```bash
cd infrastructure/terraform

terraform init
terraform plan  -var-file=environments/dev.tfvars
terraform apply -var-file=environments/dev.tfvars
```

## Outputs → backend `.env`

After `apply`, read the outputs and copy them into the backend `.env`. The two IAM values are
marked `sensitive`, so print them explicitly:

```bash
terraform output                       # non-sensitive values
terraform output iam_access_key_id     # sensitive — printed individually
terraform output iam_secret_access_key
```

Suggested mapping (adjust key names to match the backend's config):

| Terraform output              | Backend `.env`                  |
| ----------------------------- | ------------------------------- |
| `s3_bucket_name`              | `AWS_S3_BUCKET`                 |
| `aws_region`                  | `AWS_REGION`                    |
| `cloudfront_domain`           | `CLOUDFRONT_DOMAIN`             |
| `cloudfront_key_pair_id`      | `CLOUDFRONT_KEY_PAIR_ID`        |
| `cloudfront_private_key_path` | `CLOUDFRONT_PRIVATE_KEY_PATH`   |
| `iam_access_key_id`           | `AWS_ACCESS_KEY_ID`             |
| `iam_secret_access_key`       | `AWS_SECRET_ACCESS_KEY`         |

## Secrets & state

- **`cloudfront-private-key.pem`** is written to this directory on `apply`. It is **secret**,
  `chmod 0600`, and **gitignored** — never commit it. The backend loads it to sign URLs.
- State is **local** for now (`terraform.tfstate`, gitignored). It contains the CloudFront
  private key and the IAM secret in plaintext, so keep it safe. Move to an encrypted **remote
  backend** (e.g. S3 + DynamoDB lock) before this is shared or used beyond local dev.

## Other environments (staging / prod)

- Add `environments/staging.tfvars` / `environments/prod.tfvars` with the right
  `environment`, `aws_region`, and `cors_allowed_origins`, then
  `terraform apply -var-file=environments/prod.tfvars`.
- Use **separate state** per environment (a key reason to move to a remote backend with one
  state path per env) so environments can't clobber each other.
- A custom domain + ACM certificate replaces the default `*.cloudfront.net` cert later.

## Note

The CloudFront public-key resource name is `${project}-${environment}-signing-key`. CloudFront
public-key names must be unique per account; if you ever recreate it, an old key with the same
name must be gone first (or rename it).
