import User from '../models/users.model.ts';
import { jobTypeEnum } from '../models/jobs.model.ts';

export class UserRepository {

  async create(firstName: string, lastName: string, email: string, password: string,
    country: string | null,
    city: string | null,
    isStudent: boolean | null,
    jobTitle: string | null,
    school: string | null,
    schoolStartYear: number | null,
    schoolEndYear: number | null,
    is16OrAbove: boolean | null,
    employmentType: string | null,
    recentCompany: string | null
    ){
    return User.create({ 
        email: email,
        password: password,
        bio:{
            first_name: firstName,
            last_name: lastName,    
            location: {
                country_region: country,
                city: city
            },
        },
        isStudent: isStudent,
        education:{
            school: school,
            start_date: schoolStartYear,
            end_date: schoolEndYear
        },
        is_16_or_above: is16OrAbove,
        work_experience:{   
                title: jobTitle,
                employmentType: employmentType,
                organization: recentCompany
            },
    });
    }

  async findByEmail(email: string ) {
        return User.findOne({ email });
    }

   async findById(id: string) {
        return User.findById(id);
    }

    async createGoogleUser(email: string, firstName: string, lastName: string, password: string) {
        return User.create({ 
            email:email, 
            bio:{
                first_name:firstName, 
                last_name:lastName
            }, 
            password: password  
        });
    }
}
