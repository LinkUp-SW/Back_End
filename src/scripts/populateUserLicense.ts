import mongoose from "mongoose";
import dotenv from "dotenv";
import users from "../models/users.model.ts";
import organizations from "../models/organizations.model.ts"; // Import the organizations model

dotenv.config();
const DATABASE_URL = process.env.DATABASE_URL || "";

const addLicenseForUser = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(DATABASE_URL, {});
    console.log("Connected to database");

    // Find the user by user_id
    const user = await users.findOne({ user_id: "Mahmoud-Amr-123" });
    if (!user) {
      console.error("User not found");
      return;
    }

    // Use the existing organization with _id "67e6bb09dc0675f19ad10880"
    const issuingOrganizationId = "67e6bb09dc0675f19ad10880";

    // Fetch the organization document from the database
    const issuingOrganization = await organizations.findById(issuingOrganizationId);
    if (!issuingOrganization) {
      console.error("Issuing organization not found");
      return;
    }

    // Create the license object
    const newLicense = {
      _id: new mongoose.Types.ObjectId().toString(),
      name: "Certified python Developer",
      issuing_organization: issuingOrganization,
      issue_date: new Date("2023-01-01"),
      expiration_date: new Date("2025-01-01"),
      credintial_id: "987654321", // Convert to string
      credintial_url: "https://example.com/certificate",
      skills: ["Python", "Flask", "Django"],
      media: [
        {
          media: "https://res.cloudinary.com/dyhnxqs6f/image/upload/v1719229880/meme_k18ky2_c_crop_w_674_h_734_x_0_y_0_u0o1yz.png",
          title: "Certificate",
          description: "Python Developer Certification",
        },
      ],
    };

    // Add the license to the user's license_certificates array
    user.liscence_certificates.push(newLicense);

    // Save the updated user document
    await user.save();

    console.log("License added successfully for user:", user.user_id);
  } catch (error) {
    console.error("Error adding license for user:", error);
  } finally {
    // Disconnect from MongoDB
    await mongoose.connection.close();
  }
};

addLicenseForUser();