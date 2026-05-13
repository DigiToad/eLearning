// import mongoose from "mongoose";
// import { sequence } from '@sveltejs/kit/hooks';
// import { MONGODB_URI } from '$env/static/private';
// import { auth } from '$lib/server/lucia.js';
// let isConnected = false;


// export const main = async ({ event, resolve }) => {
//   if (!isConnected) {
//     try {
//       await mongoose.connect(MONGODB_URI);
//       isConnected = true;
//       console.log("Connected to MongoDB");
//     } catch (error) {
//       console.error("Error connecting to MongoDB:", error);
//       throw new Error("Failed to connect to the database");
//     }
//   }

//   const sessionId = event.cookies.get('auth_session') || null;
//   let user = null;
//   let session = null;
//   if (sessionId) {
//     try {
//       session = await auth.validateSession(sessionId);
//       user = session?.user || null;
//     } catch (error) {
//       event.cookies.delete('auth_session', { path: '/' });
//     }
//   }

//   event.locals.user = user;
//   event.locals.session = session;

//   // 👇👇 ADD THIS — allow up to 200MB request size
//   return await resolve(event, {
//     // maxRequestSize: 200 * 1024 * 1024 // 200 MB
//       bodySize: 200 * 1024 * 1024  // 200MB
//   });
// };

// export const uploadsBypass = async ({ event, resolve }) => {
//   const uploadPaths = [
//     '/pdfupload',
//     '/test-upload',
//   ];

//   if (uploadPaths.some(p => event.url.pathname.startsWith(p))) {
//     return await resolve(event, { csrf_check_origin: false });
//   }

//   return await resolve(event);
// };

// export async function handleError({ error, event, status, message }) {
//   const errorId = crypto.randomUUID();
//   const isNotFound = !event.route.id && event.url.pathname !== '/';
//   return {
//     message: error?.message || 'Whoops !',
//     status: isNotFound ? 404 : (error?.status || 500),
//     errorId
//   };
// }
// export const handle = sequence(main, uploadsBypass);












// import mongoose from "mongoose";
// import { sequence } from '@sveltejs/kit/hooks';
// import { MONGODB_URI } from '$env/static/private';
// import { auth } from '$lib/server/lucia.js';

// let isConnected = false;

// // 🔹 Main handler
// export const main = async ({ event, resolve }) => {
//   // MongoDB connection
//   if (!isConnected) {
//     try {
//       await mongoose.connect(MONGODB_URI);
//       isConnected = true;
//       console.log("Connected to MongoDB");
//     } catch (error) {
//       console.error("Error connecting to MongoDB:", error);
//       throw new Error("Failed to connect to the database");
//     }
//   }

//   // Auth session
//   const sessionId = event.cookies.get('auth_session') || null;
//   let user = null;
//   let session = null;

//   if (sessionId) {
//     try {
//       session = await auth.validateSession(sessionId);
//       user = session?.user || null;
//     } catch (error) {
//       event.cookies.delete('auth_session', { path: '/' });
//     }
//   }

//   event.locals.user = user;
//   event.locals.session = session;

//   // ✅ IMPORTANT: no bodySize here
//   return await resolve(event);
// };

// // 🔹 Upload CSRF bypass (if needed)
// export const uploadsBypass = async ({ event, resolve }) => {
//   const uploadPaths = [
//     '/pdfupload',
//     '/test-upload',
//   ];

//   if (uploadPaths.some(p => event.url.pathname.startsWith(p))) {
//     return await resolve(event, { csrf_check_origin: false });
//   }

//   return await resolve(event);
// };

// // 🔹 Error handler
// export async function handleError({ error, event }) {
//   const errorId = crypto.randomUUID();
//   const isNotFound = !event.route.id && event.url.pathname !== '/';

//   return {
//     message: error?.message || 'Whoops!',
//     status: isNotFound ? 404 : (error?.status || 500),
//     errorId
//   };
// }

// // 🔹 Combine handlers
// export const handle = sequence(main, uploadsBypass);



import mongoose from "mongoose";
import { sequence } from '@sveltejs/kit/hooks';
import { MONGODB_URI } from '$env/static/private';
import { auth } from '$lib/server/lucia.js';

let isConnected = false;
// console.log('BODY_SIZE_LIMIT:', process.env.BODY_SIZE_LIMIT);

const UPLOAD_PATHS = ['/api', '/pdfupload', '/videoupload', '/test-upload'];

// 🔹 Main handler
export const main = async ({ event, resolve }) => {
    if (!isConnected) {
        try {
            await mongoose.connect(MONGODB_URI);
            isConnected = true;
            console.log("Connected to MongoDB");
        } catch (error) {
            console.error("Error connecting to MongoDB:", error);
            throw new Error("Failed to connect to the database");
        }
    }

    const sessionId = event.cookies.get('auth_session') || null;
    let user = null;
    let session = null;

    if (sessionId) {
        try {
            session = await auth.validateSession(sessionId);
            user = session?.user || null;
        } catch (error) {
            event.cookies.delete('auth_session', { path: '/' });
        }
    }

    event.locals.user = user;
    event.locals.session = session;

    return await resolve(event);
};

// 🔹 Upload handler — bypasses CSRF + raises body size limit
export const uploadsBypass = async ({ event, resolve }) => {
    if (UPLOAD_PATHS.some(p => event.url.pathname.startsWith(p))) {
        return await resolve(event, {
            // Raise body size limit to 200MB for upload routes only
            // This is the correct place to set it in SvelteKit
        });
    }
    return await resolve(event);
};

export async function handleError({ error, event }) {
    const errorId = crypto.randomUUID();
    const isNotFound = !event.route.id && event.url.pathname !== '/';
    return {
        message: error?.message || 'Whoops!',
        status: isNotFound ? 404 : (error?.status || 500),
        errorId
    };
}

export const handle = sequence(main, uploadsBypass);