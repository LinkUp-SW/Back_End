import { Request, Response } from "express";
import { uploadCoverPhoto, updateCoverPhoto, deleteCoverPhoto, getCoverPhoto } from "../../controllers/coverPhotoController.ts";
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

describe("Cover Photo Controller", () => {
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
                fieldname: "coverPhoto",
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

    describe("uploadCoverPhoto", () => {
        it("should upload and update the cover photo successfully", async () => {
            (validateUserId as jest.Mock).mockReturnValue("67d175db31b775856a0dbd58");
            (checkFileUploaded as jest.Mock).mockReturnValue(true);
            (findClientById as jest.Mock).mockResolvedValue({ save: saveMock });

            await uploadCoverPhoto(req as Request, res as Response);

            expect(findClientById).toHaveBeenCalledWith("67d175db31b775856a0dbd58", res);
            expect(saveMock).toHaveBeenCalled();
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({
                message: "Cover photo uploaded successfully",
                coverPhoto: "https://res.cloudinary.com/test/image/upload/sample.jpg",
            });
        });

        it("should return 400 if file upload fails", async () => {
            (validateUserId as jest.Mock).mockReturnValue("67d175db31b775856a0dbd58");
            (checkFileUploaded as jest.Mock).mockReturnValue(true);
            req.file = undefined;

            await uploadCoverPhoto(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({ message: "Error processing file upload" });
        });

        it("should return 400 if user ID is missing", async () => {
            (validateUserId as jest.Mock).mockReturnValue(null);

            await uploadCoverPhoto(req as Request, res as Response);

            expect(statusMock).not.toHaveBeenCalled();
            expect(jsonMock).not.toHaveBeenCalled();
        });

        it("should return 500 on unexpected errors", async () => {
            (validateUserId as jest.Mock).mockReturnValue("67d175db31b775856a0dbd58");
            (checkFileUploaded as jest.Mock).mockReturnValue(true);
            (findClientById as jest.Mock).mockRejectedValue(new Error("Database error"));

            await uploadCoverPhoto(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ message: "Error uploading cover photo", error: expect.anything() });
        });
    });

    describe("updateCoverPhoto", () => {
        it("should update the cover photo successfully", async () => {
            (validateUserId as jest.Mock).mockReturnValue("67d175db31b775856a0dbd58");
            (checkFileUploaded as jest.Mock).mockReturnValue(true);
            (findClientById as jest.Mock).mockResolvedValue({ cover_photo: "https://res.cloudinary.com/test/image/upload/old.jpg", save: saveMock });
            (extractPublicId as jest.Mock).mockReturnValue("old");

            await updateCoverPhoto(req as Request, res as Response);

            expect(findClientById).toHaveBeenCalledWith("67d175db31b775856a0dbd58", res);
            expect(extractPublicId).toHaveBeenCalledWith("https://res.cloudinary.com/test/image/upload/old.jpg");
            expect(cloudinary.uploader.destroy).toHaveBeenCalledWith("old", { invalidate: true });
            expect(saveMock).toHaveBeenCalled();
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({
                message: "Cover photo updated successfully",
                coverPhoto: "https://res.cloudinary.com/test/image/upload/sample.jpg",
            });
        });

        it("should return 400 if file upload fails", async () => {
            (validateUserId as jest.Mock).mockReturnValue("67d175db31b775856a0dbd58");
            (checkFileUploaded as jest.Mock).mockReturnValue(true);
            req.file = undefined;

            await updateCoverPhoto(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({ message: "Error processing file upload" });
        });

        it("should return 400 if user ID is missing", async () => {
            (validateUserId as jest.Mock).mockReturnValue(null);

            await updateCoverPhoto(req as Request, res as Response);

            expect(statusMock).not.toHaveBeenCalled();
            expect(jsonMock).not.toHaveBeenCalled();
        });

        it("should return 500 on unexpected errors", async () => {
            (validateUserId as jest.Mock).mockReturnValue("67d175db31b775856a0dbd58");
            (checkFileUploaded as jest.Mock).mockReturnValue(true);
            (findClientById as jest.Mock).mockRejectedValue(new Error("Database error"));

            await updateCoverPhoto(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ message: "Error updating cover photo", error: expect.anything() });
        });
    });

    describe("deleteCoverPhoto", () => {
        it("should delete the cover photo successfully", async () => {
            (validateUserId as jest.Mock).mockReturnValue("67d175db31b775856a0dbd58");
            (findClientById as jest.Mock).mockResolvedValue({ cover_photo: "https://res.cloudinary.com/test/image/upload/sample.jpg", save: saveMock });
            (extractPublicId as jest.Mock).mockReturnValue("sample");
            (cloudinary.uploader.destroy as jest.Mock).mockResolvedValue({ result: "ok" });

            await deleteCoverPhoto(req as Request, res as Response);

            expect(findClientById).toHaveBeenCalledWith("67d175db31b775856a0dbd58", res);
            expect(extractPublicId).toHaveBeenCalledWith("https://res.cloudinary.com/test/image/upload/sample.jpg");
            expect(cloudinary.uploader.destroy).toHaveBeenCalledWith("sample", { invalidate: true });
            expect(saveMock).toHaveBeenCalled();
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({ message: "Cover photo deleted successfully" });
        });

        it("should return 400 if no cover photo to delete", async () => {
            (validateUserId as jest.Mock).mockReturnValue("67d175db31b775856a0dbd58");
            (findClientById as jest.Mock).mockResolvedValue({ cover_photo: "", save: saveMock });

            await deleteCoverPhoto(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({ message: "No cover photo to delete" });
        });

        it("should return 400 if user ID is missing", async () => {
            (validateUserId as jest.Mock).mockReturnValue(null);

            await deleteCoverPhoto(req as Request, res as Response);

            expect(statusMock).not.toHaveBeenCalled();
            expect(jsonMock).not.toHaveBeenCalled();
        });

        it("should return 500 on unexpected errors", async () => {
            (validateUserId as jest.Mock).mockReturnValue("67d175db31b775856a0dbd58");
            (findClientById as jest.Mock).mockRejectedValue(new Error("Database error"));

            await deleteCoverPhoto(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ message: "Error deleting cover photo", error: expect.anything() });
        });
    });

    describe("getCoverPhoto", () => {
        it("should get the cover photo successfully", async () => {
            (validateUserId as jest.Mock).mockReturnValue("67d175db31b775856a0dbd58");
            (findClientById as jest.Mock).mockResolvedValue({ cover_photo: "https://res.cloudinary.com/test/image/upload/sample.jpg" });

            await getCoverPhoto(req as Request, res as Response);

            expect(findClientById).toHaveBeenCalledWith("67d175db31b775856a0dbd58", res);
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({ coverPhoto: "https://res.cloudinary.com/test/image/upload/sample.jpg" });
        });

        it("should return 400 if user ID is missing", async () => {
            (validateUserId as jest.Mock).mockReturnValue(null);

            await getCoverPhoto(req as Request, res as Response);

            expect(statusMock).not.toHaveBeenCalled();
            expect(jsonMock).not.toHaveBeenCalled();
        });

        it("should return 404 if no cover photo is found", async () => {
            (validateUserId as jest.Mock).mockReturnValue("67d175db31b775856a0dbd58");
            (findClientById as jest.Mock).mockResolvedValue({ cover_photo: "" });

            await getCoverPhoto(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(404);
            expect(jsonMock).toHaveBeenCalledWith({ message: "Cover photo not found" });
        });

        it("should return 500 on unexpected errors", async () => {
            (validateUserId as jest.Mock).mockReturnValue("67d175db31b775856a0dbd58");
            (findClientById as jest.Mock).mockRejectedValue(new Error("Database error"));

            await getCoverPhoto(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ message: "Error retrieving cover photo", error: expect.anything() });
        });
    });
});