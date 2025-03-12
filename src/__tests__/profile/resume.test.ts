import { Request, Response } from "express";
import { uploadResume, updateResume, deleteResume, getResume } from "../../controllers/resumeController.ts";
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

describe("Resume Controller", () => {
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
                path: "https://res.cloudinary.com/test/image/upload/sample.pdf",
                fieldname: "resume",
                originalname: "sample.pdf",
                encoding: "7bit",
                mimetype: "application/pdf",
                size: 12345,
                destination: "/uploads/",
                filename: "sample.pdf",
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

    describe("uploadResume", () => {
        it("should upload and update the resume successfully", async () => {
            (validateUserId as jest.Mock).mockReturnValue("67d175db31b775856a0dbd58");
            (checkFileUploaded as jest.Mock).mockReturnValue(true);
            (findClientById as jest.Mock).mockResolvedValue({ save: saveMock });

            await uploadResume(req as Request, res as Response);

            expect(findClientById).toHaveBeenCalledWith("67d175db31b775856a0dbd58", res);
            expect(saveMock).toHaveBeenCalled();
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({
                message: "Resume uploaded successfully",
                resume: "https://res.cloudinary.com/test/image/upload/sample.pdf",
            });
        });

        it("should return 400 if file upload fails", async () => {
            (validateUserId as jest.Mock).mockReturnValue("67d175db31b775856a0dbd58");
            (checkFileUploaded as jest.Mock).mockReturnValue(true);
            req.file = undefined;

            await uploadResume(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({ message: "Error processing file upload" });
        });

        it("should return 400 if user ID is missing", async () => {
            (validateUserId as jest.Mock).mockReturnValue(null);

            await uploadResume(req as Request, res as Response);

            expect(statusMock).not.toHaveBeenCalled();
            expect(jsonMock).not.toHaveBeenCalled();
        });

        it("should return 500 on unexpected errors", async () => {
            (validateUserId as jest.Mock).mockReturnValue("67d175db31b775856a0dbd58");
            (checkFileUploaded as jest.Mock).mockReturnValue(true);
            (findClientById as jest.Mock).mockRejectedValue(new Error("Database error"));

            await uploadResume(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ message: "Error uploading resume", error: expect.anything() });
        });
    });

    describe("updateResume", () => {
        it("should update the resume successfully", async () => {
            (validateUserId as jest.Mock).mockReturnValue("67d175db31b775856a0dbd58");
            (checkFileUploaded as jest.Mock).mockReturnValue(true);
            (findClientById as jest.Mock).mockResolvedValue({ resume: "https://res.cloudinary.com/test/image/upload/old.pdf", save: saveMock });
            (extractPublicId as jest.Mock).mockReturnValue("old");

            await updateResume(req as Request, res as Response);

            expect(findClientById).toHaveBeenCalledWith("67d175db31b775856a0dbd58", res);
            expect(extractPublicId).toHaveBeenCalledWith("https://res.cloudinary.com/test/image/upload/old.pdf");
            expect(cloudinary.uploader.destroy).toHaveBeenCalledWith("old.pdf", { invalidate: true, resource_type: "raw" });
            expect(saveMock).toHaveBeenCalled();
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({
                message: "Resume updated successfully",
                resume: "https://res.cloudinary.com/test/image/upload/sample.pdf",
            });
        });

        it("should return 400 if file upload fails", async () => {
            (validateUserId as jest.Mock).mockReturnValue("67d175db31b775856a0dbd58");
            (checkFileUploaded as jest.Mock).mockReturnValue(true);
            req.file = undefined;

            await updateResume(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({ message: "Error processing file upload" });
        });

        it("should return 400 if user ID is missing", async () => {
            (validateUserId as jest.Mock).mockReturnValue(null);

            await updateResume(req as Request, res as Response);

            expect(statusMock).not.toHaveBeenCalled();
            expect(jsonMock).not.toHaveBeenCalled();
        });

        it("should return 500 on unexpected errors", async () => {
            (validateUserId as jest.Mock).mockReturnValue("67d175db31b775856a0dbd58");
            (checkFileUploaded as jest.Mock).mockReturnValue(true);
            (findClientById as jest.Mock).mockRejectedValue(new Error("Database error"));

            await updateResume(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ message: "Error updating resume", error: expect.anything() });
        });
    });

    describe("deleteResume", () => {
        it("should delete the resume successfully", async () => {
            (validateUserId as jest.Mock).mockReturnValue("67d175db31b775856a0dbd58");
            (findClientById as jest.Mock).mockResolvedValue({ resume: "https://res.cloudinary.com/test/image/upload/sample.pdf", save: saveMock });
            (extractPublicId as jest.Mock).mockReturnValue("sample");
            (cloudinary.uploader.destroy as jest.Mock).mockResolvedValue({ result: "ok" });

            await deleteResume(req as Request, res as Response);

            expect(findClientById).toHaveBeenCalledWith("67d175db31b775856a0dbd58", res);
            expect(extractPublicId).toHaveBeenCalledWith("https://res.cloudinary.com/test/image/upload/sample.pdf");
            expect(cloudinary.uploader.destroy).toHaveBeenCalledWith("sample.pdf", { invalidate: true , resource_type: "raw"});
            expect(saveMock).toHaveBeenCalled();
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({ message: "Resume deleted successfully" });
        });

        it("should return 400 if no resume to delete", async () => {
            (validateUserId as jest.Mock).mockReturnValue("67d175db31b775856a0dbd58");
            (findClientById as jest.Mock).mockResolvedValue({ resume: "", save: saveMock });

            await deleteResume(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith({ message: "No resume to delete" });
        });

        it("should return 400 if user ID is missing", async () => {
            (validateUserId as jest.Mock).mockReturnValue(null);

            await deleteResume(req as Request, res as Response);

            expect(statusMock).not.toHaveBeenCalled();
            expect(jsonMock).not.toHaveBeenCalled();
        });

        it("should return 500 on unexpected errors", async () => {
            (validateUserId as jest.Mock).mockReturnValue("67d175db31b775856a0dbd58");
            (findClientById as jest.Mock).mockRejectedValue(new Error("Database error"));

            await deleteResume(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ message: "Error deleting resume", error: expect.anything() });
        });
    });

    describe("getResume", () => {
        it("should get the resume successfully", async () => {
            (validateUserId as jest.Mock).mockReturnValue("67d175db31b775856a0dbd58");
            (findClientById as jest.Mock).mockResolvedValue({ resume: "https://res.cloudinary.com/test/image/upload/sample.pdf" });

            await getResume(req as Request, res as Response);

            expect(findClientById).toHaveBeenCalledWith("67d175db31b775856a0dbd58", res);
            expect(statusMock).toHaveBeenCalledWith(200);
            expect(jsonMock).toHaveBeenCalledWith({ resume: "https://res.cloudinary.com/test/image/upload/sample.pdf" });
        });

        it("should return 400 if user ID is missing", async () => {
            (validateUserId as jest.Mock).mockReturnValue(null);

            await getResume(req as Request, res as Response);

            expect(statusMock).not.toHaveBeenCalled();
            expect(jsonMock).not.toHaveBeenCalled();
        });

        it("should return 404 if no resume is found", async () => {
            (validateUserId as jest.Mock).mockReturnValue("67d175db31b775856a0dbd58");
            (findClientById as jest.Mock).mockResolvedValue({ resume: "" });

            await getResume(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(404);
            expect(jsonMock).toHaveBeenCalledWith({ message: "Resume not found" });
        });

        it("should return 500 on unexpected errors", async () => {
            (validateUserId as jest.Mock).mockReturnValue("67d175db31b775856a0dbd58");
            (findClientById as jest.Mock).mockRejectedValue(new Error("Database error"));

            await getResume(req as Request, res as Response);

            expect(statusMock).toHaveBeenCalledWith(500);
            expect(jsonMock).toHaveBeenCalledWith({ message: "Error retrieving resume", error: expect.anything() });
        });
    });
});