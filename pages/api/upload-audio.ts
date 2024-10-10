// pages/api/upload-audio.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import AWS from 'aws-sdk';
import formidable, { File } from 'formidable';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises'; // Use promises for async operations

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  region: process.env.AWS_REGION!,
});

const s3 = new AWS.S3();

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function uploadAudioHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSession({ req });

  if (!session) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const form = formidable({
    multiples: false, // Set to true if you expect multiple files per field
    keepExtensions: true, // Preserve file extensions
    maxFileSize: 10 * 1024 * 1024, // 10 MB limit
  });

  try {
    const { fields, files } = await new Promise<{
      fields: formidable.Fields;
      files: formidable.Files;
    }>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    // Type assertion for 'files' to ensure it's defined
    if (!files || !files.audio) {
      return res
        .status(400)
        .json({ success: false, error: 'No audio file found' });
    }

    const audioFile = Array.isArray(files.audio)
      ? files.audio[0]
      : (files.audio as File);

    // Validate MIME type
    if (audioFile.mimetype !== 'audio/webm') {
      return res
        .status(400)
        .json({ success: false, error: 'Invalid audio file type' });
    }

    const fileContent = await fs.readFile(audioFile.filepath);

    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: `audio/${uuidv4()}.webm`,
      Body: fileContent,
      ContentType: 'audio/webm',
      ACL: 'private',
    };

    await s3.upload(params).promise();

    const signedUrl = s3.getSignedUrl('getObject', {
      Bucket: params.Bucket,
      Key: params.Key,
      Expires: 60 * 60, // URL expires in 1 hour
    });

    res.status(200).json({ success: true, audioUrl: signedUrl });
  } catch (error) {
    console.error('Error uploading audio:', error);
    res.status(500).json({ success: false, error: 'Error uploading audio' });
  }
}
