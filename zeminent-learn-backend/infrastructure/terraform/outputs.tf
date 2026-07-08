output "s3_bucket_name" {
  description = "Name of the videos S3 bucket (includes the random suffix)."
  value       = aws_s3_bucket.videos.bucket
}

output "aws_region" {
  description = "AWS region the resources live in."
  value       = var.aws_region
}

output "cloudfront_domain" {
  description = "CloudFront distribution domain (*.cloudfront.net) used to serve videos."
  value       = aws_cloudfront_distribution.videos.domain_name
}

output "cloudfront_key_pair_id" {
  description = "CloudFront public key ID — used as the key-pair ID when signing URLs."
  value       = aws_cloudfront_public_key.cloudfront_signing.id
}

output "cloudfront_private_key_path" {
  description = "Local path to the PEM the backend loads to sign CloudFront URLs."
  value       = "./cloudfront-private-key.pem"
}

output "iam_access_key_id" {
  description = "Access key ID for the backend IAM user."
  value       = aws_iam_access_key.backend.id
  sensitive   = true
}

output "iam_secret_access_key" {
  description = "Secret access key for the backend IAM user."
  value       = aws_iam_access_key.backend.secret
  sensitive   = true
}
