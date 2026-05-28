// src/lib/server/models/UserProgress.js
import mongoose from 'mongoose';

// ── Per-question breakdown (assessments only) ─────────────────────────────────
const QuestionAnalyticsSchema = new mongoose.Schema({
    questionIndex:     { type: Number  },
    question:          { type: String, default: '' },
    attemptsToCorrect: { type: Number, default: 1 },
    correct:           { type: Boolean, default: false },
}, { _id: false });

// ── One entry per lesson completed ────────────────────────────────────────────
const LessonProgressSchema = new mongoose.Schema({
    subsectionId:  { type: String, required: true },
    lessonTitle:   { type: String, default: '' },
    lessonType:    { type: String, enum: ['video', 'assessment'], default: 'video' },
    moduleId:      { type: String, default: '' },
    moduleTitle:   { type: String, default: '' },
    sectionId:     { type: String, default: '' },
    completedAt:   { type: Date,   default: Date.now },
    updatedAt:     { type: Date,   default: Date.now },

    // Video fields
    watchedSeconds:  { type: Number, default: 0 },
    durationSeconds: { type: Number, default: 0 },
    watchPct:        { type: Number, default: 0 },

    // Assessment fields
    assessmentScore:         { type: Number,  default: null },
    assessmentPassed:        { type: Boolean, default: null },
    assessmentTotalAttempts: { type: Number,  default: null },
    questionAnalytics:       { type: [QuestionAnalyticsSchema], default: undefined },
}, { _id: false });

// ── One document per (userId + courseId) ──────────────────────────────────────
const UserProgressSchema = new mongoose.Schema({
    userId:    { type: String, required: true },
    userEmail: { type: String, default: '' },
    courseId:  { type: String, required: true },

    // All lessons for this course completed by this user
    lessons:   { type: [LessonProgressSchema], default: [] },

    firstSeenAt: { type: Date, default: Date.now },
    updatedAt:   { type: Date, default: Date.now },
});

// One document per user per course
UserProgressSchema.index({ userId: 1, courseId: 1 }, { unique: true });

// Fast lookups
UserProgressSchema.index({ courseId: 1 });   // admin: everyone in a course
UserProgressSchema.index({ userId: 1 });     // user: all their courses

export const UserProgress =
    mongoose.models.UserProgress ||
    mongoose.model('UserProgress', UserProgressSchema);