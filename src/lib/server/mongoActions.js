
import { auth } from '$lib/server/lucia.js';
import { User } from '$lib/server/models/User.js';
import Profile from '$lib/server/models/Profile.js';
import { Key } from '$lib/server/models/Key.js';
import { Session } from '$lib/server/models/Session.js';
import mongoose from 'mongoose';
import { Course, CourseDraft } from '$lib/server/models/Courses.js';
import { nanoid } from 'nanoid';
import { LuciaError } from 'lucia';
import { Courseinfo } from '$lib/server/models/Courseinfo.js';
import { Section } from '$lib/server/models/Section.js';



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
      // console.log("No existing user found by email (expected):", error.message);
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
      firstName: body.firstName,
      lastName: body.lastName,
    },
  });
  // console.log("Lucia user created successfully:", JSON.stringify(luciaUser, null, 2));
} catch (error) {
  // console.error("ERROR creating Lucia user:", error);
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
        institution: body.institution,
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
      console.log("Key retrieved successfully:", JSON.stringify(key, null, 2));
    } catch (error) {
      console.error("ERROR using key:", error);
      console.error("Error stack:", error.stack);
      throw new Error(`Failed to use key: ${error.message}`);
    }

    // Step 9: Get user
    // console.log("Step 9: Getting user...");
    let user = null;
    try {
      user = await auth.getUser(key.userId);
      // console.log("User retrieved successfully:", JSON.stringify(user, null, 2));

    } catch (error) {
      // console.error("ERROR getting user:", error);
      // console.error("Error stack:", error.stack);
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

    // console.log("=== SIGNUP PROCESS COMPLETED SUCCESSFULLY ===");
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

export async function getAllCourses({ page = 1, search = '', pageSize = 10 } = {}) {
  const filter = {};
  if (search) {
    const re = { $regex: search, $options: 'i' };
    filter.$or = [
      { title: re },
      { category: re },
      { instructor: re },
      { tags: re },
      { id: re }
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
  return CourseDraft.findOne({ courseId }).lean();
}

export async function getAllDrafts() {
  return CourseDraft.find({ step: { $ne: 'done' } }).lean();
}


export async function createCourseDraft({
  title, category, instructor, level,
  description, image, tags
}) {
  const courseId = nanoid(10);

  const draft = await CourseDraft.create({
    courseId,
    step: 'modules',
    courseData: {
      id: courseId,
      title,
      category,
      instructor,
      instructorAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(instructor)}`,
      level,
      description,
      image,
      tags: (tags ?? '').split(',').map(t => t.trim()).filter(Boolean),
      totalLessons: 0,
      duration: '0h',
      modules: []          // starts empty; admin adds modules one by one
    }
  });

  return draft;
}


export async function addModule({ courseId }) {
  const draft = await CourseDraft.findOne({ courseId });
  if (!draft) throw new Error('Draft not found for courseId: ' + courseId);

  const idx = draft.courseData.modules.length;

  draft.courseData.modules.push({
    id: `mod-${courseId}-${idx + 1}`,
    title: '',
    hasAssessment: null,     // undecided — UI will prompt
    lessons: [],
    assessment: null
  });

  draft.markModified('courseData');
  await draft.save();
  return draft;
}


export async function setModuleAssessmentFlag({ courseId, moduleIndex, hasAssessment }) {
  const draft = await CourseDraft.findOne({ courseId });
  if (!draft) throw new Error('Draft not found for courseId: ' + courseId);

  const modIdx = Number(moduleIndex);
  if (!draft.courseData.modules[modIdx])
    throw new Error(`Module at index ${modIdx} does not exist.`);

  draft.courseData.modules[modIdx].hasAssessment = Boolean(hasAssessment);

  // If admin switches OFF assessment requirement AND an assessment is already saved,
  // clear it so completion logic is not confused.
  if (!hasAssessment) {
    draft.courseData.modules[modIdx].assessment = null;
  }

  draft.markModified('courseData');
  await draft.save();
  return draft;
}


export async function setModuleTitle({ courseId, moduleIndex, title }) {
  const draft = await CourseDraft.findOne({ courseId });
  if (!draft) throw new Error('Draft not found.');

  const modIdx = Number(moduleIndex);
  if (!draft.courseData.modules[modIdx])
    throw new Error(`Module at index ${modIdx} does not exist.`);

  draft.courseData.modules[modIdx].title = title;
  draft.markModified('courseData');
  await draft.save();
  return draft;
}


export async function uploadLesson({
  courseId, moduleIndex, lessonTitle, videoUrl, durationSeconds
}) {
  const draft = await CourseDraft.findOne({ courseId });
  if (!draft) throw new Error('Draft not found for courseId: ' + courseId);

  const modIdx = Number(moduleIndex);
  if (!draft.courseData.modules[modIdx])
    throw new Error(`Module at index ${modIdx} does not exist.`);

  const lesson = {
    id: `les-${courseId}-${modIdx}-${nanoid(4)}`,
    title: lessonTitle,
    durationSeconds: Number(durationSeconds),
    videoUrl
  };

  draft.courseData.modules[modIdx].lessons.push(lesson);

  // Recalculate totals from actual data (not a stored counter)
  let totalSecs = 0;
  let totalLessons = 0;
  for (const mod of draft.courseData.modules) {
    for (const les of mod.lessons) {
      totalSecs += les.durationSeconds;
      totalLessons += 1;
    }
  }

  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);

  draft.courseData.totalLessons = totalLessons;
  draft.courseData.duration = m ? `${h}h ${m}m` : `${h}h`;

  draft.markModified('courseData');
  await draft.save();
  return draft;
}


export async function uploadAssessment({ courseId, moduleIndex, assessmentJson }) {
  // Parse
  let parsed;
  try {
    parsed = typeof assessmentJson === 'string'
      ? JSON.parse(assessmentJson)
      : assessmentJson;
  } catch {
    throw new Error('Assessment data is not valid JSON.');
  }

  // Validate shape
  const errors = [];
  if (!parsed.title || typeof parsed.title !== 'string' || !parsed.title.trim())
    errors.push('Assessment must have a "title" field.');
  if (!Array.isArray(parsed.questions) || parsed.questions.length === 0)
    errors.push('Assessment must contain a non-empty "questions" array.');

  (parsed.questions ?? []).forEach((q, qi) => {
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
          errors.push(`Question[${qi}] Option[${oi}] "isCorrect" must be boolean.`);
      });
    }
  });

  if (errors.length) throw new Error(errors.join('\n'));

  const modIdx = Number(moduleIndex);
  const asmntId = `asmnt-${courseId}-${modIdx + 1}`;

  const assessment = {
    id: asmntId,
    title: parsed.title.trim(),
    // Use whatever the admin entered; fall back to 70 only if truly absent
    passMark: parsed.passMark ?? 70,
    attemptsAllowed: parsed.attemptsAllowed ?? 3,
    questions: parsed.questions.map((q, qi) => ({
      id: q.id || `q-${courseId}-${modIdx}-${qi}`,
      text: q.text,
      type: q.type,
      options: q.options.map((o, oi) => ({
        id: o.id || `opt-${qi}-${oi}`,
        text: o.text,
        isCorrect: o.isCorrect
      }))
    }))
  };

  const draft = await CourseDraft.findOne({ courseId });
  if (!draft) throw new Error('Draft not found for courseId: ' + courseId);

  if (!draft.courseData.modules[modIdx])
    throw new Error(`Module at index ${modIdx} does not exist.`);

  draft.courseData.modules[modIdx].assessment = assessment;

  // Also ensure hasAssessment is marked true (in case it was null before)
  draft.courseData.modules[modIdx].hasAssessment = true;

  draft.markModified('courseData');
  await draft.save();
  return draft;
}


export async function publishCourse({ courseId }) {
  const draft = await CourseDraft.findOne({ courseId });
  if (!draft) throw new Error('Draft not found.');

  const data = draft.courseData;

  if (!data.modules || data.modules.length === 0)
    throw new Error('Course must have at least one module before publishing.');

  // Validate every module
  const problems = [];
  data.modules.forEach((m, i) => {
    const label = m.title || `Module ${i + 1}`;
    if (m.hasAssessment === null || m.hasAssessment === undefined)
      problems.push(`${label}: assessment preference not set.`);
    if (m.lessons.length === 0)
      problems.push(`${label}: no lessons uploaded.`);
    if (m.hasAssessment === true && !m.assessment)
      problems.push(`${label}: assessment required but not saved.`);
  });

  if (problems.length)
    throw new Error(problems.join('\n'));

  const course = await Course.findOneAndUpdate(
    { id: courseId },
    { ...data, status: 'published' },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  draft.step = 'done';
  await draft.save();
  return course;
}


export async function updateCourse({
  courseId,
  title,
  category,
  instructor,
  description,
  level,
  tags,
  image
}) {
  const draft = await CourseDraft.findOne({ courseId });
  if (!draft) throw new Error('Draft not found.');

  // Update all top-level courseData fields
  if (title !== undefined) draft.courseData.title = title;
  if (category !== undefined) draft.courseData.category = category;
  if (instructor !== undefined) draft.courseData.instructor = instructor;
  if (description !== undefined) draft.courseData.description = description;
  if (level !== undefined) draft.courseData.level = level;

  // Parse tags from comma-separated string
  if (tags !== undefined) {
    draft.courseData.tags = tags.split(',').map(t => t.trim()).filter(Boolean);
  }

  // Only overwrite image when a new one was uploaded
  if (image) {
    draft.courseData.image = image;
  }

  draft.markModified('courseData');
  await draft.save();
  return draft;
}

export async function courseInfo({
  title, instructor, level,
  description, image, keywords, price
}) {
  try {
    const courseId = nanoid(10);
    await Courseinfo.create({
      courseId,
      courseinfoid: courseId,
      title,
      instructor,
      instructorAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(instructor)}`,
      level,
      description,
      image,
      keywords,
      price,
    });

    return {
      status: 200,
      success: true,
      message: 'Course info saved successfully.',
    };

  } catch (err) {
    console.error('courseInfo error:', err);
    return {
      status: 500,
      success: false,
      message: 'Failed to save course info. Please try again.',
    };
  }
}
export async function updateCourseInfo(courseId, body) {

    let keywords = body.keywords;
    if (Array.isArray(keywords)) {
        keywords = keywords.map(k => k.trim()).filter(Boolean);
    } else if (typeof keywords === "string") {
        keywords = keywords.split(",").map(k => k.trim()).filter(Boolean);
    } else {
        keywords = [];
    }

    const result = await Courseinfo.findOneAndUpdate(
        { courseId },
        {
            $set: {
                title:       body.title,
                instructor:  body.instructor,
                level:       body.level,
                description: body.description,
                price:       Number(body.price),
                image:       body.image,
                keywords,
            }
        },
        { new: true }
    );

    if (!result) throw new Error("Course not found.");
    return { message: "Course updated successfully.", data: result };
}