import mongoose from 'mongoose';
const { Schema } = mongoose;
const newsroomSchema = new Schema(
  {
    title: {
      type: String,
    },
    previewText: {
      type: String,
    },
    image: {
      type: String, 
    },
    location :{
      type: String,
    },
    newsLink: {
      type: String,
    },
    Keyword: {
      type: String,
    },
    startDate :{
type: String,
    },
    endDate:{
type: String,
    },
    startTime:{
type: String,
    },
    endTime :{
type: String,
    },
    shortDescription:{
      type: String,
    },
    eventUrl :{
type: String,
    },
    eventType : {
type: String,
    },
uploadedUrl :{
  type: String,
},
Keywords:{
type:String,
},
 status: {
      type: String,
      default: "Upcoming"  
    },
  },
  
  
  {
    timestamps: true,
    collection: 'Events',
  }
);
const Events =mongoose.models.Events || mongoose.model('Events', newsroomSchema);
export default Events;
