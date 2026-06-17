import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { error, json } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request }) {
    try {
        console.log('➡️ Upload request received');
        const formData = await request.formData();
        console.log('📦 Form data received:', formData);

        // Accept both 'image' and 'video' field names
        const file = formData.get('image') || formData.get('video');
        const filename = formData.get('filename');

        if (!file || !(file instanceof File)) {
            console.error('❌ Invalid file uploaded:', file);
            throw error(400, 'Invalid file uploaded');
        }

        if (!filename || typeof filename !== 'string') {
            console.error('❌ Invalid filename received:', filename);
            throw error(400, 'Invalid filename');
        }

        // Allowed MIME types
        const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
        const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo'];
        const allAllowedTypes = [...allowedImageTypes, ...allowedVideoTypes];

        if (!allAllowedTypes.includes(file.type)) {
            console.error('❌ Unsupported file type:', file.type);
            throw error(400, `Unsupported file type: ${file.type}. Allowed: images and mp4/webm/ogg/mov/avi videos.`);
        }

        const isVideo = allowedVideoTypes.includes(file.type);

        // Size limits: images 2MB, videos 100MB
        // const maxSize = isVideo ? 1000 * 1024 * 1024 : 5 * 1024 * 1024;
        // if (file.size > maxSize) {
        //     console.error('❌ File too large:', file.size);
        //     throw error(400, `File too large. Max size: ${isVideo ? '1000MB' : '5MB'}`);
        // }
        const maxSize = isVideo ? 2 * 1024 * 1024 * 1024 : 5 * 1024 * 1024;

        if (file.size > maxSize) {
            console.error('❌ File too large:', file.size);
            throw error(400, `File too large. Max size: ${isVideo ? '2GB' : '5MB'}`);
        }
        console.log('📂 Processing file:', filename, 'Size:', file.size, 'Type:', file.type, isVideo ? '(video)' : '(image)');

        const buffer = Buffer.from(await file.arrayBuffer());
        console.log('✅ File converted to buffer');

        const uploadDir = path.join("/main/beta");
        console.log('📁 Upload directory:', uploadDir);

        await mkdir(uploadDir, { recursive: true });
        console.log('📂 Directory ensured/created:', uploadDir);
        const safeFileName = file.name.replace(/[\\:*?"<>|]/g, '-');
        const filePath = path.join(uploadDir, safeFileName);
        console.log('📍 File will be saved at:', filePath);

        await writeFile(filePath, buffer);
        console.log('✅ File successfully written:', filePath);

        return json({
            message: `${isVideo ? 'Video' : 'Image'} uploaded successfully`,
            url: `/beta/${safeFileName}`,
            type: isVideo ? 'video' : 'image'
        });

    } catch (err) {
        console.error('❌ Upload Error:', err);
        throw error(500, err);
    }
}
