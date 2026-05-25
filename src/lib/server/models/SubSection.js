// src/lib/server/models/SubSection.js

import mongoose from "mongoose";

const QuestionSchema = new mongoose.Schema({
    question: {
        type: String,
        trim: true
    },

    options: [
        {
            type: String,
            trim: true
        }
    ],

    answer: {
        type: Number,
        default: 0
    },
    _id:false
});

const SubSectionSchema = new mongoose.Schema(
    {

        courseId: {
            type: String,
            required: true,
            trim: true,
            index: true
        },


        sectionId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "Section",
            index: true
        },


        moduleSectionId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            index: true
        },

        title: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String,
            default: ""
        },
        type: {
            type: String,
            enum: ["video", "assessment"],
            required: true
        },
        videoUrl: {
            type: String,
            default: ""
        },



        duration: {
            type: Number,
            default: 0
        },

        questions: [QuestionSchema],


        status: {
            type: String,
            enum: ["draft", "published"],
            default: "draft"
        }
    },
    {
        timestamps: true,
        collection: "SubSection"
    }
);

export const SubSection =
    mongoose.models.SubSection ||
    mongoose.model("SubSection", SubSectionSchema);