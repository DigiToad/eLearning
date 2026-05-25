// import mongoose from 'mongoose';

// // ─── Option Schema ─────
// const OptionSchema = new mongoose.Schema({
//   id:        { type: String, required: true },
//   text:      { type: String, required: true },
//   isCorrect: { type: Boolean, required: true }
// }, { _id: false });

// // ─── Question Schema ──
// const QuestionSchema = new mongoose.Schema({
//   id:      { type: String, required: true },
//   text:    { type: String, required: true },
//   type:    { type: String, enum: ['mcq', 'truefalse'], required: true },
//   options: { type: [OptionSchema], required: true, validate: {
//     validator: (opts) => opts.length >= 2 && opts.some(o => o.isCorrect),
//     message:   'Each question needs ≥2 options and at least one correct answer.'
//   }}
// }, { _id: false });

// // ─── Assessment Schema ──────
// const AssessmentSchema = new mongoose.Schema({
//   id:              { type: String, required: true },
//   title:           { type: String, required: true },
//   passMark:        { type: Number, default: 70 },
//   attemptsAllowed: { type: Number, default: 3 },
//   questions:       { type: [QuestionSchema], required: true, validate: {
//     validator: (qs) => qs.length >= 1,
//     message:   'An assessment must have at least one question.'
//   }}
// }, { _id: false });

// // ─── Lesson Schema ─────────────
// const LessonSchema = new mongoose.Schema({
//   id:              { type: String, required: true },
//   title:           { type: String, required: true },
//   durationSeconds: { type: Number, required: true },
//   videoUrl:        { type: String, required: true }
// }, { _id: false });

// // ─── Module Schema ───────
// const ModuleSchema = new mongoose.Schema({
//   id:         { type: String, required: true },
//   title:      { type: String, required: true },
//   passMark:   { type: Number, default: 70 },
//   lessons:    { type: [LessonSchema],    default: [] },
//   assessment: { type: AssessmentSchema,  default: null }
// }, { _id: false });

// // ─── Course Schema (CourseList) ──────
// const CourseSchema = new mongoose.Schema({
//   id:              { type: String, required: true, unique: true },
//   title:           { type: String, required: true, trim: true },
//   // category:        { type: String, required: true, trim: true },
//   // instructor:      { type: String, required: true, trim: true },
//   // instructorAvatar:{ type: String, default: '' },
//   // duration:        { type: String, default: '0h' },         
//   // totalLessons:    { type: Number, default: 0 },
//   // level:           { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], required: true },
//   // rating:          { type: Number, default: 0, min: 0, max: 5 },
//   // students:        { type: Number, default: 0 },
//   // description:     { type: String, required: true },
//   // image:           { type: String, required: true },         // thumbnail URL / path
//   // tags:            { type: [String], default: [] },
//   // modules:         { type: [ModuleSchema], default: [] },
//   status:          { type: String, enum: ['draft', 'published'], default: 'draft' }
// }, {
//   timestamps: true,
//   collection: 'courselist'
// });

// // ─── Draft / Upload-in-progress Schema ──

// const CourseDraftSchema = new mongoose.Schema({
//   courseId:      { type: String, required: true, unique: true },
//   step:          { type: String, enum: ['info', 'modules', 'done'], default: 'info' },
//   totalVideos:   { type: Number, required: true },        
//   uploadedCount: { type: Number, default: 0 },
//   numberOfModules : {type: Number, default: 0},
//   courseData:    { type: mongoose.Schema.Types.Mixed }      
// }, {
//   timestamps: true,
//   collection: 'coursedrafts'
// });

// export const Course      = mongoose.models.Course      || mongoose.model('Course',      CourseSchema);
// export const CourseDraft = mongoose.models.CourseDraft || mongoose.model('CourseDraft', CourseDraftSchema);






// src/lib/server/models/Courses.js
import mongoose from 'mongoose';

// ─── Option Schema ─────────────────────────────────────────────────────────────
const OptionSchema = new mongoose.Schema({
  id:        { type: String, required: true },
  text:      { type: String, required: true },
  isCorrect: { type: Boolean, required: true }
}, { _id: false });

// ─── Question Schema ───────────────────────────────────────────────────────────
const QuestionSchema = new mongoose.Schema({
  id:   { type: String, required: true },
  text: { type: String, required: true },
  type: { type: String, enum: ['mcq', 'truefalse'], required: true },
  options: {
    type:     [OptionSchema],
    required: true,
    validate: {
      validator: (opts) => opts.length >= 2 && opts.some(o => o.isCorrect),
      message:   'Each question needs ≥2 options and at least one correct answer.'
    }
  }
}, { _id: false });

// ─── Assessment Schema ─────────────────────────────────────────────────────────
const AssessmentSchema = new mongoose.Schema({
  id:              { type: String, required: true },
  title:           { type: String, required: true },
  // passMark & attemptsAllowed come from whatever the admin enters.
  // The default here is a DB-level safety net only, not a UI override.
  passMark:        { type: Number, default: 70 },
  attemptsAllowed: { type: Number, default: 3 },
  questions: {
    type:     [QuestionSchema],
    required: true,
    validate: {
      validator: (qs) => qs.length >= 1,
      message:   'An assessment must have at least one question.'
    }
  }
}, { _id: false });

// ─── Lesson Schema ─────────────────────────────────────────────────────────────
const LessonSchema = new mongoose.Schema({
  id:              { type: String, required: true },
  title:           { type: String, required: true },
  durationSeconds: { type: Number, required: true },
  videoUrl:        { type: String, required: true }
}, { _id: false });

// ─── Module Schema ─────────────────────────────────────────────────────────────
const ModuleSchema = new mongoose.Schema({
  id:    { type: String, required: true },
  // title starts empty and is saved later via setModuleTitle — not required at creation.
  title: { type: String, default: '' },

  // hasAssessment controls completion logic:
  //   null  = not yet decided (UI must prompt admin before publish is allowed)
  //   true  = module requires an assessment; publish blocked until one is saved
  //   false = no assessment for this module; lessons alone make it complete
  hasAssessment: {
    type:    Boolean,
    default: null   // null means "undecided"
  },

  lessons:    { type: [LessonSchema],   default: [] },
  assessment: { type: AssessmentSchema, default: null }
}, { _id: false });

// ─── Course Schema (CourseList collection) ─────────────────────────────────────
const CourseSchema = new mongoose.Schema({
  id:               { type: String, required: true, unique: true },
  title:            { type: String, required: true, trim: true },
  category:         { type: String, required: true, trim: true },
  instructor:       { type: String, required: true, trim: true },
  instructorAvatar: { type: String, default: '' },
  duration:         { type: String, default: '0h' },
  totalLessons:     { type: Number, default: 0 },
  level:            {
    type:     String,
    enum:     ['Beginner', 'Intermediate', 'Advanced'],
    required: true
  },
  rating:      { type: Number, default: 0, min: 0, max: 5 },
  students:    { type: Number, default: 0 },
  description: { type: String, required: true },
  image:       { type: String, required: true },
  tags:        { type: [String], default: [] },
  modules:     { type: [ModuleSchema], default: [] },
  status:      {
    type:    String,
    enum:    ['draft', 'published'],
    default: 'draft'
  }
}, {
  timestamps: true,
  collection: 'courselist'
});

// ─── Draft Schema (coursedrafts collection) ────────────────────────────────────
// Holds work-in-progress course data until publishCourse() is called.
// Modules, lessons and assessments are stored inside courseData (Mixed) so the
// admin can freely mutate the structure during the build phase.
const CourseDraftSchema = new mongoose.Schema({
  courseId: { type: String, required: true, unique: true },

  // step tracks the overall draft lifecycle:
  //   'modules' = actively being built
  //   'done'    = published; kept for audit but excluded from active draft lists
  step: {
    type:    String,
    enum:    ['modules', 'done'],
    default: 'modules'
  },

  // courseData holds the full structured payload.
  // Mixed type gives flexibility during the build phase;
  // publishCourse() validates it before writing to CourseSchema.
  courseData: { type: mongoose.Schema.Types.Mixed }
}, {
  timestamps: true,
  collection: 'coursedrafts'
});

export const Course      = mongoose.models.Course      || mongoose.model('Course',      CourseSchema);
export const CourseDraft = mongoose.models.CourseDraft || mongoose.model('CourseDraft', CourseDraftSchema);