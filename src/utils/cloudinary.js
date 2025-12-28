import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import dotenv from "dotenv"


dotenv.config()

//configure cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});


const uploadOnCloudinary = async(localFilePath) => {
    try {
        if(!localFilePath){
            return null
        }

          const response = await  cloudinary.uploader.upload(
            localFilePath, {
                resource_type:"auto"
            }
        )

        console.log("File uploaded on cloudinary. File src: "+response.url);
        //once the file is uploaded , we will delete it from the server

        fs.unlinkSync(localFilePath)
        return response


    } catch (error) {
        console.error("Cloudinary upload error:", error);
        if (fs.existsSync(localFilePath)) {
          fs.unlinkSync(localFilePath);
        }        
                throw new Error(
                  `Failed to upload file to Cloudinary: ${error.message}`
                );
    }
}

const deleteImageToCloudinary = async (cloudinaryFilePath) => {
    try {
        if(!cloudinaryFilePath){
            return null
        }
        
        const filePath = cloudinaryFilePath.split("/");
        const fileName = filePath[filePath.length - 1].split(".")[0]; //getting public id
        

        return await cloudinary.uploader.destroy(fileName,
            {resource_type:"image"},
            (err, _) =>{
                if(err){
                    console.log("error deleting from cloudinary ", err);
                    return null
                }
            }

        )
        
    } catch (error) {
        console.log("error deleting from cloud  inary ", error);
        return null
    }
}

const deleteVideoToCloudinary = async (cloudinaryFilePath) => {
  try {
    if (!cloudinaryFilePath) return null;

    const filePath = cloudinaryFilePath.split("/");
    const fileName = filePath[filePath.length - 1].split(".")[0];

    return await cloudinary.uploader.destroy(
      fileName,
      { resource_type: "video" },
      (err, _) => {
        if (err) {
          console.error("Error deleting file:", err);
        }
      }
    );
  } catch (e) {
    console.log("Error deleting cloudinary file: " + e.message);
  }
};




export { uploadOnCloudinary, deleteImageToCloudinary, deleteVideoToCloudinary };