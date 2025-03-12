import { Request, Response } from "express";
import { uploadProfilePicture, updateProfilePicture, deleteProfilePicture, getProfilePicture } from "../../controllers/profilePictureController.ts";
import { findClientById, validateUserId, checkFileUploaded } from "../../utils/validators.ts";
import cloudinary from "../../../config/cloudinary.ts";
import { extractPublicId } from "../../services/cloudinaryService.ts";

jest.mock("../../utils/validators.ts", () => ({
    validateUserId: jest.fn(),
    checkFileUploaded: jest.fn(),
    findClientById: jest.fn(),
}));

jest.mock("../../../config/cloudinary.ts", () => ({
    uploader: {
        destroy: jest.fn(),
    },
}));

jest.mock("../../services/cloudinaryService.ts", () => ({
    extractPublicId: jest.fn(),
}));

describe("Profile Picture Controller", () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let jsonMock: jest.Mock;
    let statusMock: jest.Mock;
    let saveMock: jest.Mock;

    beforeEach(() => {
        jsonMock = jest.fn();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });
        saveMock = jest.fn();

        req = {
            file: {
                path: "https://res.cloudinary.com/test/image/upload/sample.jpg",
                fieldname: "profilePicture",
                originalname: "sample.jpg",
                encoding: "7bit",
                mimetype: "image/jpeg",
                size: 12345,
                destination: "/uploads/",
                filename: "sample.jpg",
                buffer: Buffer.from(""),
            } as Express.Multer.File,
            body: {},
            params: { user_id: "67d175db31b775856a0dbd58" },
        } as Partial<Request>;

        res = {
            status: statusMock,
            json: jsonMock,
        } as Partial<Response>;
    });

    describe("uploadProfilePicture", () => {
        it("should upload and update the profile picture successfully", async () => {
            (validateUserId as jest.Mock).mockReturnValue("67d175db31b775856a0dbd58");
            (checkFileUploaded as jest.Mock).mockReturnValue(true);
            (findClientById as jest.Mock).mockResolvedValue({ save: saveMock });

            await uploadProfilePicture(req as Request, res as Response);

            expect(findClientById).toHaveBeenCalledWith("67d175db31b775856a0dbd58", res);
            expect(saveMock).toHaveBeenCalled();
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({
                message: "Profile picture uploaded and updated successfully",
                profilePicture: "https://res.cloudinary.com/test/image/upload/sample.jpg",
            });
        });

        it("should return 400 if file upload fails", async () => {
            (validateUserId as jest.Mock).mockReturnValue("67d175db31b775856a0dbd58");
            (checkFileUploaded as jest.Mock).mockReturnValue(true);
            req.file = undefined;

            await uploadProfilePicture(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({ message: "Error processing file upload" });
        });

        it("should return 400 if user ID is missing", async () => {
            (validateUserId as jest.Mock).mockReturnValue(null);

            await uploadProfilePicture(req as Request, res as Response);

            expect(statusMock).not.toHaveBeenCalled();
            expect(jsonMock).not.toHaveBeenCalled();
        });

        it("should return 500 on unexpected errors", async () => {
            (validateUserId as jest.Mock).mockReturnValue("67d175db31b775856a0dbd58");
            (checkFileUploaded as jest.Mock).mockReturnValue(true);
            (findClientById as jest.Mock).mockRejectedValue(new Error("Database error"));

            await uploadProfilePicture(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ message: "Error uploading profile picture", error: expect.anything() });
        });
    });

    describe("updateProfilePicture", () => {
        it("should update the profile picture successfully", async () => {
            (validateUserId as jest.Mock).mockReturnValue("67d175db31b775856a0dbd58");
            (checkFileUploaded as jest.Mock).mockReturnValue(true);
            (findClientById as jest.Mock).mockResolvedValue({ profile_photo: "https://res.cloudinary.com/test/image/upload/old.jpg", save: saveMock });
            (extractPublicId as jest.Mock).mockReturnValue("old");

            await updateProfilePicture(req as Request, res as Response);

            expect(findClientById).toHaveBeenCalledWith("67d175db31b775856a0dbd58", res);
            expect(extractPublicId).toHaveBeenCalledWith("https://res.cloudinary.com/test/image/upload/old.jpg");
            expect(cloudinary.uploader.destroy).toHaveBeenCalledWith("old", { invalidate: true });
            expect(saveMock).toHaveBeenCalled();
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({
                message: "Profile picture updated successfully",
                profilePicture: "https://res.cloudinary.com/test/image/upload/sample.jpg",
            });
        });

        it("should return 400 if file upload fails", async () => {
            (validateUserId as jest.Mock).mockReturnValue("67d175db31b775856a0dbd58");
            (checkFileUploaded as jest.Mock).mockReturnValue(true);
            req.file = undefined;

            await updateProfilePicture(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({ message: "Error processing file upload" });
        });

        it("should return 400 if user ID is missing", async () => {
            (validateUserId as jest.Mock).mockReturnValue(null);

            await updateProfilePicture(req as Request, res as Response);

            expect(statusMock).not.toHaveBeenCalled();
            expect(jsonMock).not.toHaveBeenCalled();
        });

        it("should return 500 on unexpected errors", async () => {
            (validateUserId as jest.Mock).mockReturnValue("67d175db31b775856a0dbd58");
            (checkFileUploaded as jest.Mock).mockReturnValue(true);
            (findClientById as jest.Mock).mockRejectedValue(new Error("Database error"));

            await updateProfilePicture(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ message: "Error updating profile picture", error: expect.anything() });
        });
    });

    describe("deleteProfilePicture", () => {
        it("should delete the profile picture successfully", async () => {
            (validateUserId as jest.Mock).mockReturnValue("67d175db31b775856a0dbd58");
            (findClientById as jest.Mock).mockResolvedValue({ profile_photo: "https://res.cloudinary.com/test/image/upload/sample.jpg", save: saveMock });
            (extractPublicId as jest.Mock).mockReturnValue("sample");
            (cloudinary.uploader.destroy as jest.Mock).mockResolvedValue({ result: "ok" });

            await deleteProfilePicture(req as Request, res as Response);

            expect(findClientById).toHaveBeenCalledWith("67d175db31b775856a0dbd58", res);
            expect(extractPublicId).toHaveBeenCalledWith("https://res.cloudinary.com/test/image/upload/sample.jpg");
            expect(cloudinary.uploader.destroy).toHaveBeenCalledWith("sample", { invalidate: true });
            expect(saveMock).toHaveBeenCalled();
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({ message: "Profile picture deleted successfully" });
        });

        it("should return 400 if no profile picture to delete", async () => {
            (validateUserId as jest.Mock).mockReturnValue("67d175db31b775856a0dbd58");
            (findClientById as jest.Mock).mockResolvedValue({ profile_photo: "", save: saveMock });

            await deleteProfilePicture(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({ message: "No profile picture to delete" });
        });

        it("should return 400 if user ID is missing", async () => {
            (validateUserId as jest.Mock).mockReturnValue(null);

            await deleteProfilePicture(req as Request, res as Response);

            expect(statusMock).not.toHaveBeenCalled();
            expect(jsonMock).not.toHaveBeenCalled();
        });

        it("should return 500 on unexpected errors", async () => {
            (validateUserId as jest.Mock).mockReturnValue("67d175db31b775856a0dbd58");
            (findClientById as jest.Mock).mockRejectedValue(new Error("Database error"));

            await deleteProfilePicture(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ message: "Error deleting profile picture", error: expect.anything() });
        });
    });

    describe("getProfilePicture", () => {
        it("should get the profile picture successfully", async () => {
            (validateUserId as jest.Mock).mockReturnValue("67d175db31b775856a0dbd58");
            (findClientById as jest.Mock).mockResolvedValue({ profile_photo: "https://res.cloudinary.com/test/image/upload/sample.jpg" });

            await getProfilePicture(req as Request, res as Response);

            expect(findClientById).toHaveBeenCalledWith("67d175db31b775856a0dbd58", res);
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({ profilePicture: "https://res.cloudinary.com/test/image/upload/sample.jpg" });
        });

        it("should return 400 if user ID is missing", async () => {
            (validateUserId as jest.Mock).mockReturnValue(null);

            await getProfilePicture(req as Request, res as Response);

            expect(statusMock).not.toHaveBeenCalled();
            expect(jsonMock).not.toHaveBeenCalled();
        });

        it("should return 404 if no profile picture is found", async () => {
            (validateUserId as jest.Mock).mockReturnValue("67d175db31b775856a0dbd58");
            (findClientById as jest.Mock).mockResolvedValue({ profile_photo: "" });

            await getProfilePicture(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(404);
            expect(jsonMock).toHaveBeenCalledWith({ message: "Profile picture not found" });
        });

        it("should return 500 on unexpected errors", async () => {
            (validateUserId as jest.Mock).mockReturnValue("67d175db31b775856a0dbd58");
            (findClientById as jest.Mock).mockRejectedValue(new Error("Database error"));

            await getProfilePicture(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ message: "Error retrieving profile picture", error: expect.anything() });
        });
    });
});