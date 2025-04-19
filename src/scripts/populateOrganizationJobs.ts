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
            "Smart Systems",
            "DataMinds Corp",
            "CloudForce Technologies",
            "AlphaCode Studios",
            "Bright Knowledge University",
            "Omega Business Solutions"
        ];
        
        const industries = [
            "Technology", 
            "Consulting", 
            "Education", 
            "Design", 
            "Software",
            "Data Analytics",
            "Cloud Computing",
            "Game Development",
            "Higher Education",
            "Business Services"
        ];
        
        const locations = [
            "New York, USA", 
            "London, UK", 
            "Cairo, Egypt", 
            "Berlin, Germany", 
            "Tokyo, Japan",
            "San Francisco, USA",
            "Toronto, Canada",
            "Dubai, UAE",
            "Sydney, Australia",
            "Singapore"
        ];

        // Create 10 organizations (8 companies, 2 education)
        for (let i = 0; i < 10; i++) {
            // Ensure indices 2 and 8 are education type, others are company
            const categoryType = (i === 2 || i === 8) ? categoryTypeEnum.education : categoryTypeEnum.company;
            
            const organization = await organizations.create({
                name: organizationNames[i],
                category_type: categoryType,
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
            console.log(`Created organization: ${organization.name} (${categoryType})`);
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
            "Project Manager",
            "DevOps Engineer",
            "Business Analyst",
            "Content Writer",
            "Financial Analyst"
        ];
        
        const jobDescriptions = [
            "Develop and maintain software applications using modern technologies.",
            "Lead product development from conception to launch.",
            "Analyze data and build machine learning models.",
            "Create user-friendly interfaces and improve user experience.",
            "Develop and implement marketing strategies.",
            "Manage HR functions and employee relations.",
            "Drive sales and build client relationships.",
            "Oversee projects from planning to completion.",
            "Build and maintain CI/CD pipelines and infrastructure automation.",
            "Analyze business processes and recommend improvements.",
            "Create compelling content for various platforms.",
            "Perform financial modeling and analysis."
        ];
        
        const skills = [
            ["JavaScript", "React", "Node.js", "TypeScript"],
            ["Product Strategy", "Agile", "Roadmapping", "User Research"],
            ["Python", "SQL", "Machine Learning", "Statistics"],
            ["Figma", "UI Design", "Wireframing", "User Testing"],
            ["Digital Marketing", "Content Creation", "SEO", "Social Media"],
            ["Recruitment", "Employee Relations", "Benefits Administration", "HR Policies"],
            ["Negotiation", "CRM", "Lead Generation", "Relationship Building"],
            ["Project Planning", "Budgeting", "Team Leadership", "Risk Management"],
            ["Docker", "Kubernetes", "AWS", "CI/CD", "Terraform"],
            ["SQL", "Data Analysis", "Process Mapping", "Requirements Gathering"],
            ["Copywriting", "SEO", "Content Strategy", "Editing"],
            ["Financial Modeling", "Excel", "Forecasting", "Data Analysis"]
        ];

        const qualificationsList = [
            ["Bachelor's degree in Computer Science", "3+ years experience in software development", "Strong knowledge of JavaScript frameworks", "Experience with RESTful APIs"],
            ["Bachelor's degree in Business or related field", "5+ years of product management experience", "Experience with product lifecycle management", "Strong analytical skills"],
            ["Master's degree in Data Science or related field", "Experience with Python and R", "Knowledge of statistical methods", "Experience with big data technologies"],
            ["Bachelor's degree in Design or related field", "Portfolio demonstrating UI/UX skills", "Experience with design tools like Figma", "Understanding of user-centered design"],
            ["Bachelor's degree in Marketing", "Experience with digital marketing campaigns", "Knowledge of marketing analytics", "Social media management experience"],
            ["Bachelor's degree in HR or Business", "2+ years HR experience", "Knowledge of HR laws and regulations", "Experience with HRIS systems"],
            ["Bachelor's degree in Business or related field", "Previous sales experience", "Strong communication skills", "Experience with CRM software"],
            ["PMP certification preferred", "5+ years project management experience", "Experience with Agile and Scrum", "Budget management experience"],
            ["Bachelor's degree in Computer Science or related field", "Experience with cloud platforms", "Knowledge of containerization", "Scripting and automation experience"],
            ["Bachelor's degree in Business or related field", "Strong analytical skills", "SQL proficiency", "Experience with business process improvement"],
            ["Bachelor's degree in English, Journalism, or related field", "Portfolio of writing samples", "SEO knowledge", "Experience with content management systems"],
            ["Bachelor's degree in Finance or Accounting", "Financial modeling experience", "Advanced Excel skills", "Knowledge of financial reporting"]
        ];

        const responsibilitiesList = [
            ["Develop and maintain web applications", "Work with cross-functional teams", "Optimize application for performance", "Troubleshoot and debug issues"],
            ["Define product vision and strategy", "Gather and prioritize requirements", "Work with engineering teams", "Analyze market trends"],
            ["Build and implement machine learning models", "Clean and process large datasets", "Create data visualizations", "Present findings to stakeholders"],
            ["Create user interfaces and experiences", "Conduct user research", "Create wireframes and prototypes", "Collaborate with development teams"],
            ["Develop marketing campaigns", "Manage social media presence", "Analyze marketing metrics", "Create content for various channels"],
            ["Manage recruitment process", "Handle employee relations", "Administer benefits programs", "Develop HR policies"],
            ["Identify and pursue sales leads", "Conduct product demonstrations", "Negotiate contracts", "Maintain client relationships"],
            ["Develop project plans", "Allocate resources", "Track project progress", "Communicate with stakeholders"],
            ["Maintain cloud infrastructure", "Automate deployment processes", "Implement security best practices", "Monitor system performance"],
            ["Analyze business requirements", "Document business processes", "Create functional specifications", "Test implemented solutions"],
            ["Create engaging content", "Edit and proofread materials", "Optimize content for SEO", "Maintain content calendar"],
            ["Prepare financial reports", "Conduct financial forecasting", "Analyze financial data", "Support budget planning"]
        ];

        const benefitsList = [
            ["Competitive salary", "Health insurance", "401(k) matching", "Flexible working hours", "Professional development opportunities"],
            ["Stock options", "Health and dental coverage", "Unlimited PTO", "Remote work options", "Wellness programs"],
            ["Competitive compensation", "Health benefits", "Learning stipend", "Remote work options", "Flexible schedule"],
            ["Comprehensive benefits package", "Professional development", "Creative work environment", "Flexible hours", "Remote work options"],
            ["Competitive salary", "Performance bonuses", "Health insurance", "Professional growth opportunities", "Team events"],
            ["Competitive pay", "Health and dental coverage", "401(k) plan", "Work-life balance", "Professional development"],
            ["Base salary plus commission", "Health benefits", "Sales incentives", "Travel opportunities", "Professional development"],
            ["Competitive salary", "Performance bonuses", "Health coverage", "Professional certification support", "Flexible schedule"],
            ["Competitive compensation", "Health benefits", "Remote work options", "Professional development budget", "Latest technology"],
            ["Competitive salary", "Healthcare coverage", "401(k) with company match", "Professional development", "Flexible schedule"],
            ["Competitive pay", "Flexible work arrangements", "Health benefits", "Professional development", "Creative environment"],
            ["Competitive salary", "Performance bonuses", "Health and retirement benefits", "Professional certification support", "Work-life balance"]
        ];

        // Distribute 30 jobs across 10 organizations (3 jobs per organization)
        let jobCount = 0;
        for (const organization of organizationsArray) {
            // Create 3 job listings for each organization
            for (let j = 0; j < 3; j++) {
                const jobIndex = (jobCount % jobTitles.length);
                const job = await jobs.create({
                    organization_id: organization._id,
                    job_title: jobTitles[jobIndex],
                    location: organization.location,
                    job_type: Object.values(jobTypeEnum)[jobCount % Object.values(jobTypeEnum).length],
                    workplace_type: Object.values(workplaceTypeEnum)[jobCount % Object.values(workplaceTypeEnum).length],
                    organization_industry: [organization.industry],
                    experience_level: Object.values(experienceLevelEnum)[jobCount % Object.values(experienceLevelEnum).length],
                    description: jobDescriptions[jobIndex],
                    qualifications: qualificationsList[jobIndex],
                    responsibilities: responsibilitiesList[jobIndex],
                    benefits: benefitsList[jobIndex],
                    targetted_skills: skills[jobIndex],
                    receive_applicants_by: jobCount % 2 === 0 ? receiveApplicantsByEnum.email : receiveApplicantsByEnum.external,
                    receiving_method: jobCount % 2 === 0 ? 
                        `jobs@${organization.unique_url}.com` : 
                        `https://careers.${organization.unique_url}.com/apply`,
                    screening_questions: {
                        questions: `Do you have experience with ${skills[jobIndex].join(', ')}?`,
                        answers: ["Yes, extensive experience", "Some experience", "Limited experience", "No experience"],
                        ideal_answer: "Yes, extensive experience",
                        is_must_qualification: jobCount % 3 === 0,
                        rejection_message: "We are looking for candidates with more relevant experience.",
                        is_filtererd: true
                    },
                    how_did_you_hear_about_us: Object.values(howDidYouHearAboutUsEnum)[jobCount % Object.values(howDidYouHearAboutUsEnum).length],
                    salary: 50000 + (jobCount * 5000) + (jobIndex * 3000),
                    posted_time: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000), // Random date within last 30 days
                    applied_applications: []
                }) as jobsInterface;
                
                console.log(`Created job #${jobCount+1}: ${job.job_title} for ${organization.name}`);
                jobCount++;
            }
        }

        console.log(`Successfully created ${organizationsArray.length} organizations and ${jobCount} jobs.`);
    } catch (error) {
        console.error("Error populating organizations and jobs:", error);
    } finally {
        // Disconnect from MongoDB
        await mongoose.connection.close();
    }
};

populateOrganizationJobs();
