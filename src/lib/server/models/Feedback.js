import mongoose from 'mongoose';

const FeedbackSchema = new mongoose.Schema(
	{

		eventTitle : {
			type: String
		},
		name: {
			type: String,
			required: [true, 'Name is required'],
			trim: true,
			
		},
		email: {
			type: String,
			required: [true, 'Email is required'],
			trim: true,
			lowercase: true,
			
		},
		phone: {
			type: String,
			
			trim: true
		},
		country: {
			type: String,
		
			trim: true
		},
		organization: {
			type: String,
		
			trim: true,
			
		},

		// ── Webinar Context ───────────────────────────────────────────
		primaryAreaOfInterest: {
			type: String,
			enum: [
				'Artificial Intelligence / ML',
				'Data Science & Analytics',
				'Cloud Computing',
				'Cybersecurity',
				'IoT / Embedded Systems',
				'Software Development',
				'Digital Transformation',
				'Other'
			]
		},
		purposeOfAttending: {
			type: String,
		
			enum: [
				'Learn new skills',
				'Stay updated with industry trends',
				'Network with peers',
				'Evaluate product/solution',
				'Academic research',
				'Professional development',
				'Other'
			]
		},

		// ── Ratings (all 1–5) ─────────────────────────────────────────
		usefulnessRating: {
			type: Number,
			required: [true, 'Usefulness rating is required'],
		
		},
		presentationRating: {
			type: Number,
			
		
		},
		awarenessRating: {
			type: Number,
			
			
		},
		demoRating: {
			type: Number,
			
		},
		questionsRating: {
			type: Number,
			
		},

		// ── Follow-up ─────────────────────────────────────────────────
		receiveUpdates: {
			type: String,
			required: [true, 'Please select an option'],
			enum: ['Yes', 'No']
		},
		supportNeeded: {
			type: String,
			required: [true, 'Support description is required'],
			trim: true,
		
		},
   status: {
      type: String,
      default: "unread"  
    },
		
	},
	{
		timestamps: true, // adds createdAt + updatedAt
		collection: 'feedback'
	}
);

// Avoid model recompilation in SvelteKit dev (HMR)
const Feedback =
	mongoose.models.Feedback ||
	mongoose.model('Feedback', FeedbackSchema);

export default Feedback;