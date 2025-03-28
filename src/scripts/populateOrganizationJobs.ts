import mongoose from "mongoose";
import dotenv from "dotenv";
import organizations from "../models/organizations.model.ts";
import jobs from "../models/jobs.model.ts";
import { organizationsInterface, categoryTypeEnum, organizationSizeEnum, organizationTypeEnum, adminLevelEnum } from "../models/organizations.model.ts";
import { jobsInterface, jobTypeEnum, workplaceTypeEnum, experienceLevelEnum, receiveApplicantsByEnum, howDidYouHearAboutUsEnum } from "../models/jobs.model.ts";
import users from "../models/users.model.ts";

dotenv.config();
const DATABASE_URL = process.env.DATABASE_URL || "";

const populateOrganizationJobs = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(DATABASE_URL, {});
        console.log("Connected to database");

        // Find an admin user to be assigned as organization admin
        const adminUser = await users.findOne({});
        if (!adminUser) {
            console.error("No users found for admin assignment");
            return;
        }

        // Create sample organizations
        const organizationsArray = [];
        const organizationNames = [
            "Tech Innovations Inc", 
            "Global Solutions Ltd", 
            "Future Academy", 
            "Digital Creations", 
            "Smart Systems"
        ];
        
        const industries = [
            "Technology", 
            "Consulting", 
            "Education", 
            "Design", 
            "Software"
        ];
        
        const locations = [
            "New York, USA", 
            "London, UK", 
            "Cairo, Egypt", 
            "Berlin, Germany", 
            "Tokyo, Japan"
        ];

        for (let i = 0; i < 5; i++) {
            const organization = await organizations.create({
                organization_name: organizationNames[i],
                category_type: i % 2 === 0 ? categoryTypeEnum.company : categoryTypeEnum.education,
                unique_url: organizationNames[i].toLowerCase().replace(/\s+/g, '-'),
                website: `https://www.${organizationNames[i].toLowerCase().replace(/\s+/g, '')}.com`,
                logo: `https://example.com/logos/${i + 1}.png`,
                description: `${organizationNames[i]} is a leading organization in ${industries[i]}.`,
                industry: industries[i],
                location: locations[i],
                size: Object.values(organizationSizeEnum)[i % Object.values(organizationSizeEnum).length],
                type: Object.values(organizationTypeEnum)[i % Object.values(organizationTypeEnum).length],
                posts: [],
                followers: [],
                blocked: [],
                conversations: [],
                admins: [{
                    admin: adminUser._id,
                    level: adminLevelEnum.super_admin
                }]
            }) as organizationsInterface;
            
            organizationsArray.push(organization);
            console.log(`Created organization: ${organization.organization_name}`);
        }

        // Create sample jobs for each organization
        const jobTitles = [
            "Software Engineer", 
            "Product Manager", 
            "Data Scientist", 
            "UX Designer", 
            "Marketing Specialist",
            "HR Coordinator",
            "Sales Representative",
            "Project Manager"
        ];
        
        const jobDescriptions = [
            "Develop and maintain software applications using modern technologies.",
            "Lead product development from conception to launch.",
            "Analyze data and build machine learning models.",
            "Create user-friendly interfaces and improve user experience.",
            "Develop and implement marketing strategies.",
            "Manage HR functions and employee relations.",
            "Drive sales and build client relationships.",
            "Oversee projects from planning to completion."
        ];
        
        const skills = [
            ["JavaScript", "React", "Node.js", "TypeScript"],
            ["Product Strategy", "Agile", "Roadmapping", "User Research"],
            ["Python", "SQL", "Machine Learning", "Statistics"],
            ["Figma", "UI Design", "Wireframing", "User Testing"],
            ["Digital Marketing", "Content Creation", "SEO", "Social Media"],
            ["Recruitment", "Employee Relations", "Benefits Administration"],
            ["Negotiation", "CRM", "Lead Generation", "Relationship Building"],
            ["Project Planning", "Budgeting", "Team Leadership", "Risk Management"]
        ];

        for (const organization of organizationsArray) {
            // Create 3 job listings for each organization
            for (let j = 0; j < 3; j++) {
                const jobIndex = (j % jobTitles.length);
                const job = await jobs.create({
                    organization_id: organization._id,
                    job_title: jobTitles[jobIndex],
                    location: organization.location,
                    job_type: Object.values(jobTypeEnum)[j % Object.values(jobTypeEnum).length],
                    workplace_type: Object.values(workplaceTypeEnum)[j % Object.values(workplaceTypeEnum).length],
                    organization_industry: [organization.industry],
                    experience_level: Object.values(experienceLevelEnum)[j % Object.values(experienceLevelEnum).length],
                    job_description: jobDescriptions[jobIndex],
                    targetted_skills: skills[jobIndex],
                    receive_applicants_by: receiveApplicantsByEnum.email,
                    receiving_method: `jobs@${organization.unique_url}.com`,
                    screening_questions: {
                        questions: "Do you have experience with the required skills?",
                        answers: ["Yes", "No", "Somewhat"],
                        ideal_answer: "Yes",
                        is_must_qualification: true,
                        rejection_message: "We are looking for candidates with relevant experience.",
                        is_filtererd: true
                    },
                    how_did_you_hear_about_us: Object.values(howDidYouHearAboutUsEnum)[j % Object.values(howDidYouHearAboutUsEnum).length],
                    salary: 50000 + (j * 20000),
                    applied_applications: []
                }) as jobsInterface;
                
                console.log(`Created job: ${job.job_title} for ${organization.organization_name}`);
            }
        }

        console.log("Organizations and jobs populated successfully.");
    } catch (error) {
        console.error("Error populating organizations and jobs:", error);
    } finally {
        // Disconnect from MongoDB
        await mongoose.connection.close();
    }
};

populateOrganizationJobs();
