import Events from '$lib/server/models/Events.js';
import Contactus from '$lib/server/models/Contact.js';
import Products from '$lib/server/models/Component.js'
import Partners from '$lib/server/models/Partners';
import { auth } from '$lib/server/lucia.js';
import { User } from '$lib/server/models/User.js';
import Profile from '$lib/server/models/Profile.js';
import { Key } from '$lib/server/models/Key.js';
import { Session } from '$lib/server/models/Session.js';
import Oems from '$lib/server/models/Oem.js'
import { LuciaError } from 'lucia';
import Productdemo from '$lib/server/models/Productdemo.js';
import Quote from '$lib/server/models/Quoteform.js';
import TechnicalDiscussion from '$lib/server/models/TechnicalSpecification.js';
import Category from '$lib/server/models/Category.js'
import WebinarFeedback from '$lib/server/models/Feedback.js';
import FeedbackHandson from '$lib/server/models/FeedbackHandson.js';
import FeaturedProducts from '$lib/server/models/Featured.js';




export const signUp = async (body, cookies) => {
  try {
    // console.log("=== SIGNUP PROCESS STARTED ===");
    // console.log("Request body:", JSON.stringify(body, null, 2));
    // console.log("Cookies object:", cookies);

    // Step 1: Check for existing user by email
    // console.log("Step 1: Checking for existing user by email...");
    let existingUser = null;
    try {
      existingUser = await auth.getKey("email", body.email);
      // console.log("Existing user found:", existingUser);
    } catch (error) {
      console.log("No existing user found by email (expected):", error.message);
      existingUser = null;
    }

    // Step 2: Check for existing username
    // console.log("Step 2: Checking for existing username...");
    let existingUsernameKey = null;
    try {
      existingUsernameKey = await auth.getKey('username', body.username);
      // console.log("Existing username found:", existingUsernameKey);
    } catch (error) {
      // console.log("No existing username found (expected):", error.message);
      existingUsernameKey = null;
    }

    // console.log("existingUser:", existingUser);
    // console.log("existingUsernameKey:", existingUsernameKey);

    // Step 3: Validate uniqueness
    if (existingUser) {
      console.log("ERROR: Email already exists");
      return {
        success: false,
        message: "This email already exists. Please login or try with another.",
      };
    }

    if (existingUsernameKey) {
      console.log("ERROR: Username already exists");
      return {
        success: false,
        message: "This username already exists. Please login or try with another.",
      };
    }

    // Step 4: Create Lucia user
    // console.log("Step 4: Creating Lucia user...");
    let luciaUser = null;
    try {
      luciaUser = await auth.createUser({
        key: {
          providerId: "email",
          providerUserId: body.email,
          password: body.password,
        },
        attributes: {
          username: body.firstName,
          email: body.email,
        },
      });
      // console.log("Lucia user created successfully:", JSON.stringify(luciaUser, null, 2));
    } catch (error) {
      // console.error("ERROR creating Lucia user:", error);
      // console.error("Error stack:", error.stack);
      throw new Error(`Failed to create user: ${error.message}`);
    }

    // Step 5: Create user profile
    // console.log("Step 5: Creating user profile...");
    let savedProfile = null;
    try {
      const newProfile = new Profile({
        userId: luciaUser.userId,
        firstName: body.firstName,
        lastName: body.lastName,
        phone: body.phone,
        email: body.email,
        institution :body.institution,
        branch : body.branch,
        isEmailVerified: body.isEmailVerified,
        
      });
      // console.log("Profile object created:", JSON.stringify(newProfile, null, 2));

      savedProfile = JSON.parse(JSON.stringify(await newProfile.save()));
      // console.log("Profile saved successfully:", JSON.stringify(savedProfile, null, 2));
    } catch (error) {
      // console.error("ERROR creating/saving profile:", error);
      // console.error("Error stack:", error.stack);
      throw new Error(`Failed to create profile: ${error.message}`);
    }
    // console.log("Step 8: Using key for authentication...");
    let key = null;
    try {
      key = await auth.useKey("email", body.email, body.password);
      // console.log("Key retrieved successfully:", JSON.stringify(key, null, 2));
    } catch (error) {
      // console.error("ERROR using key:", error);
      // console.error("Error stack:", error.stack);
      throw new Error(`Failed to use key: ${error.message}`);
    }

    // Step 9: Get user
    // console.log("Step 9: Getting user...");
    let user = null;
    try {
      user = await auth.getUser(key.userId);
      // console.log("User retrieved successfully:", JSON.stringify(user, null, 2));
    } catch (error) {
      console.error("ERROR getting user:", error);
      console.error("Error stack:", error.stack);
      throw new Error(`Failed to get user: ${error.message}`);
    }

    // Step 10: Create session
    // console.log("Step 10: Creating session...");
    let session = null;
    try {
      session = await auth.createSession({
        userId: user.userId,
        attributes: {},
      });
      // console.log("Session created successfully:", JSON.stringify(session, null, 2));
    } catch (error) {
      // console.error("ERROR creating session:", error);
      // console.error("Error stack:", error.stack);
      throw new Error(`Failed to create session: ${error.message}`);
    }

    // Step 11: Create session cookie
    // console.log("Step 11: Creating session cookie...");
    let sessionCookie = null;
    try {
      sessionCookie = auth.createSessionCookie(session);
      // console.log("Session cookie created successfully:", JSON.stringify(sessionCookie, null, 2));
    } catch (error) {
      // console.error("ERROR creating session cookie:", error);
      // console.error("Error stack:", error.stack);
      throw new Error(`Failed to create session cookie: ${error.message}`);
    }

    // Step 12: Set cookie
    console.log("Step 12: Setting cookie...");
    try {
      cookies.set(
        sessionCookie.name,
        sessionCookie.value,
        sessionCookie.attributes
      );
      // console.log("Cookie set successfully");
      // console.log("Cookie name:", sessionCookie.name);
      // console.log("Cookie value:", sessionCookie.value);
      // console.log("Cookie attributes:", JSON.stringify(sessionCookie.attributes, null, 2));
    } catch (error) {
      // console.error("ERROR setting cookie:", error);
      // console.error("Error stack:", error.stack);
      throw new Error(`Failed to set cookie: ${error.message}`);
    }

    console.log("=== SIGNUP PROCESS COMPLETED SUCCESSFULLY ===");
    return {
      success: true,
      message: "Signup successful",
    };

  } catch (error) {
    // console.error("=== SIGNUP PROCESS FAILED ===");
    // console.error("Final error:", error);
    // console.error("Error message:", error.message);
    // console.error("Error stack:", error.stack);

    return {
      success: false,
      message: `Signup failed: ${error.message}`,
      error: error.stack
    };
  }
};

// mongoActions.js  –  all DB operations used by +page.server.js
import mongoose from 'mongoose';
import { Course, CourseDraft } from '$lib/server/models/Courses.js';
import { nanoid } from 'nanoid';



// ═════════════════════════════════════════════════════════════════════════════
// STEP 1 – Save basic course info + create draft
// ═════════════════════════════════════════════════════════════════════════════
export async function getAllCourses({ page = 1, search = '', pageSize = 10 } = {}) {
  // await connectDB();
 
  const filter = {};
  if (search) {
    const re = { $regex: search, $options: 'i' };
    filter.$or = [
      { title:      re },
      { category:   re },
      { instructor: re },
      { tags:       re },
      {courseId : re}
    ];
  }
 
  const [records, totalCount] = await Promise.all([
    Course.find(filter, { modules: 0 })   // exclude heavy modules array from list view
          .sort({ createdAt: -1 })
          .skip((page - 1) * pageSize)
          .limit(pageSize)
          .lean(),
    Course.countDocuments(filter)
  ]);
 
  return {
    records: JSON.parse(JSON.stringify(records)),
    totalCount
  };
}
 
export async function getDraft(courseId) {
  // await connectDB();
  return CourseDraft.findOne({ courseId }).lean();
}
 
export async function getAllDrafts() {
  // await connectDB();
  return CourseDraft.find({ step: { $ne: 'done' } }).lean();
}
 
// ═════════════════════════════════════════════════════════════════════════════
// STEP 1 – Create draft
// ═════════════════════════════════════════════════════════════════════════════
export async function createCourseDraft({
  title, category, instructor, level,
  description, image, tags, totalVideos, numberOfModules
}) {
  // await connectDB();
 
  const courseId = nanoid(10);
 
  const modules = Array.from({ length: Number(numberOfModules) }, (_, i) => ({
    id:         `mod-${courseId}-${i + 1}`,
    title:      '',
    passMark:   70,
    lessons:    [],
    assessment: null
  }));
 
  const draft = await CourseDraft.create({
    courseId,
    step:          'modules',
    totalVideos:   Number(totalVideos),
    uploadedCount: 0,
    courseData: {
      id:              courseId,
      title,
      category,
      instructor,
      instructorAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(instructor)}`,
      level,
      description,
      image,
      tags:            tags.split(',').map(t => t.trim()).filter(Boolean),
      totalLessons:    0,
      duration:        '0h',
      modules
    }
  });
 
  return draft;
}
 
// ═════════════════════════════════════════════════════════════════════════════
// STEP 2 – Upload a lesson into a module
// ═════════════════════════════════════════════════════════════════════════════
export async function uploadLesson({
  courseId, moduleIndex, lessonTitle, videoUrl, durationSeconds
}) {
  // await connectDB();
 
  const draft = await CourseDraft.findOne({ courseId });
  if (!draft) throw new Error('Draft not found for courseId: ' + courseId);
 
  const modIdx = Number(moduleIndex);
  const lesson = {
    id:              `les-${courseId}-${modIdx}-${nanoid(4)}`,
    title:           lessonTitle,
    durationSeconds: Number(durationSeconds),
    videoUrl
  };
 
  draft.courseData.modules[modIdx].lessons.push(lesson);
  draft.uploadedCount += 1;
  draft.courseData.totalLessons = (draft.courseData.totalLessons || 0) + 1;
 
  // Recalculate total duration
  let totalSecs = 0;
  for (const mod of draft.courseData.modules) {
    for (const les of mod.lessons) totalSecs += les.durationSeconds;
  }
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  draft.courseData.duration = m ? `${h}h ${m}m` : `${h}h`;
 
  draft.markModified('courseData');
  await draft.save();
  return draft;
}
 
// ═════════════════════════════════════════════════════════════════════════════
// STEP 3 – Upload & validate assessment JSON for a module
// ═════════════════════════════════════════════════════════════════════════════
export async function uploadAssessment({ courseId, moduleIndex, assessmentJson }) {
  // await connectDB();
 
  // Parse
  let parsed;
  try {
    parsed = typeof assessmentJson === 'string'
      ? JSON.parse(assessmentJson)
      : assessmentJson;
  } catch {
    throw new Error('Assessment file is not valid JSON.');
  }
 
  // Validate
  const errors = [];
  if (!parsed.title)
    errors.push('Assessment must have a "title" field.');
  if (!Array.isArray(parsed.questions) || parsed.questions.length === 0)
    errors.push('Assessment must contain a non-empty "questions" array.');
 
  (parsed.questions || []).forEach((q, qi) => {
    if (!q.text)
      errors.push(`Question[${qi}] missing "text".`);
    if (!q.type || !['mcq', 'truefalse'].includes(q.type))
      errors.push(`Question[${qi}] "type" must be "mcq" or "truefalse".`);
    if (!Array.isArray(q.options) || q.options.length < 2)
      errors.push(`Question[${qi}] must have ≥2 options.`);
    else {
      if (!q.options.some(o => o.isCorrect === true))
        errors.push(`Question[${qi}] must have at least one correct option (isCorrect: true).`);
      q.options.forEach((o, oi) => {
        if (!o.text)
          errors.push(`Question[${qi}] Option[${oi}] missing "text".`);
        if (typeof o.isCorrect !== 'boolean')
          errors.push(`Question[${qi}] Option[${oi}] "isCorrect" must be boolean (true/false), not a string.`);
      });
    }
  });
 
  if (errors.length) throw new Error(errors.join('\n'));
 
  // Normalise
  const modIdx    = Number(moduleIndex);
  const asmntId   = `asmnt-${courseId}-${modIdx + 1}`;
 
  const assessment = {
    id:              asmntId,
    title:           parsed.title,
    passMark:        parsed.passMark        ?? 70,
    attemptsAllowed: parsed.attemptsAllowed ?? 3,
    questions: parsed.questions.map((q, qi) => ({
      id:      q.id || `q-${courseId}-${modIdx}-${qi}`,
      text:    q.text,
      type:    q.type,
      options: q.options.map((o, oi) => ({
        id:        o.id || `opt-${qi}-${oi}`,
        text:      o.text,
        isCorrect: o.isCorrect
      }))
    }))
  };
 
  const draft = await CourseDraft.findOne({ courseId });
  if (!draft) throw new Error('Draft not found for courseId: ' + courseId);
 
  draft.courseData.modules[modIdx].assessment = assessment;
  if (!draft.courseData.modules[modIdx].title)
    draft.courseData.modules[modIdx].title = parsed.moduleTitle || `Module ${modIdx + 1}`;
 
  draft.markModified('courseData');
  await draft.save();
  return draft;
}
 
// ═════════════════════════════════════════════════════════════════════════════
// STEP 4 – Set module title
// ═════════════════════════════════════════════════════════════════════════════
export async function setModuleTitle({ courseId, moduleIndex, title }) {
  // await connectDB();
  const draft = await CourseDraft.findOne({ courseId });
  if (!draft) throw new Error('Draft not found.');
  draft.courseData.modules[Number(moduleIndex)].title = title;
  draft.markModified('courseData');
  await draft.save();
  return draft;
}
 
// ═════════════════════════════════════════════════════════════════════════════
// FINALIZE – Publish to CourseList collection
// ═════════════════════════════════════════════════════════════════════════════
export async function publishCourse({ courseId }) {
  // await connectDB();
 
  const draft = await CourseDraft.findOne({ courseId });
  if (!draft) throw new Error('Draft not found.');
 
  const data = draft.courseData;
 
  const incomplete = data.modules.filter(m => m.lessons.length === 0 || !m.assessment);
  if (incomplete.length)
    throw new Error(`${incomplete.length} module(s) still missing lessons or assessment.`);
 
  const course = await Course.findOneAndUpdate(
    { id: courseId },
    { ...data, status: 'published' },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
 
  draft.step = 'done';
  await draft.save();
  return course;
}
