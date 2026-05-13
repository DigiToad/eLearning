import mongoose from 'mongoose';

const featuredProductSchema = new mongoose.Schema(
    {
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'products' 
        },
        title: {
            type: String,
           
        },
      description:{
      type: String,
      },
      image :{
        type:String
      },
      producturl :{
        type : String
      }
    },
    {
        timestamps: true,
        collection: 'featuredproducts'
    }
);

const FeaturedProducts =
    mongoose.models.FeaturedProducts ||
    mongoose.model('FeaturedProducts', featuredProductSchema);

export default FeaturedProducts;