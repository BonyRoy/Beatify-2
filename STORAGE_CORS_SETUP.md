# Firebase Storage CORS Setup

To show embedded album art from MP3 files for **existing tracks** (tracks uploaded before the Admin extraction feature), you need to configure CORS on your Firebase Storage bucket. This allows the player to fetch the audio file and extract embedded artwork.

## Setup Steps

1. **Install Google Cloud SDK** (includes `gsutil`):
   - macOS: `brew install google-cloud-sdk`
   - Or download from: https://cloud.google.com/sdk/docs/install

2. **Authenticate** (if not already):

   ```bash
   gcloud auth login
   gcloud config set project beatify-873fb
   ```

3. **Apply CORS configuration**:

   ```bash
   gsutil cors set storage-cors.json gs://beatify-873fb.appspot.com
   ```

   If your bucket name is different, find it in Firebase Console → Storage → bucket name.

4. **Verify** (optional):
   ```bash
   gsutil cors get gs://beatify-873fb.appspot.com
   ```

## For New Uploads

New tracks uploaded through the Admin panel will automatically have their embedded album art extracted and saved—no CORS configuration needed.
