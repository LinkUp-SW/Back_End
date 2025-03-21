import User from '../models/users.model.ts';
import { jobTypeEnum } from '../models/jobs.model.ts';

export class UserRepository {

  async create(userId:string, firstName: string, lastName: string, email: string, password: string,
    country: string,
    city: string,
    isStudent: boolean | null,
    jobTitle: string | null,
    school: string | null,
    schoolStartYear: number | null,
    schoolEndYear: number | null,
    is16OrAbove: boolean | null,
    birthDate: Date | null,
    employmentType: string | null,
    recentCompany: string | null
    ){
    return User.create({ 
        user_id: userId,
        email: email,
        password: password,
        bio:{
            first_name: firstName,
            last_name: lastName,    
            location: {
                country_region: country,
                city: city
            },
            birthday: birthDate
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
                organization_name: recentCompany
            },
    });
    }

    async update(userId:string, firstName: string, lastName: string, email: string, password: string,
        country: string,
        city: string,
        isStudent: boolean | null,
        jobTitle: string | null,
        school: string | null,
        schoolStartYear: number | null,
        schoolEndYear: number | null,
        is16OrAbove: boolean | null,
        birthDate: Date | null,
        employmentType: string | null,
        recentCompany: string | null
        ){
        return User.updateMany(
            { user_id: userId }, 
            { 
                email: email,
                password: password,
                bio:{
                    first_name: firstName,
                    last_name: lastName,    
                    location: {
                        country_region: country,
                        city: city
                    },
                    birthday: birthDate
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
                        organization_name: recentCompany
                    },
            }
        );
    }

   async findByEmail(email: string ) {
        return User.findOne({ email });
    }

   async findByUserId(id: string) {
        return User.findOne({ user_id: id });
    }

    async createGoogleUser(user_id: string, email: string, firstName: string, lastName: string, password: string) {
        return User.create({ 
            user_id: user_id,
            email:email, 
            bio:{
                first_name:firstName, 
                last_name:lastName
            }, 
            password: password  
        });
    }

    async updateEmail(user_id: string, email: string) {
        return User.updateOne({ user_id: user_id }, { $set: { email: email } });
    }

    async deleteAccount(user_id:string){
        return User.deleteOne({ user_id: user_id })
    }
}
