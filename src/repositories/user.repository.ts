import User from '../models/users.model.ts';
import { jobTypeEnum, experienceLevelEnum } from '../models/jobs.model.ts';
import { statusEnum, sexEnum, accountStatusEnum, invitationsEnum } from '../models/users.model.ts';

export class UserRepository {
  async create(userId: string, firstName: string, lastName: string, email: string, password: string,
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
  ) {
    return User.create({
      user_id: userId,
      email: email,
      password: password,
      bio: {
        first_name: firstName,
        last_name: lastName,
        headline: "",  // Default empty headline
        experience: [],
        education: [],
        website: "",
        location: {
          country_region: country,
          city: city
        },
        contact_info: {
          phone_number: null,
          country_code: null,
          phone_type: null,
          address: null,
          birthday: birthDate,
          website: null
        }
      },
      education: [{
        school: school,
        degree: null,
        field_of_study: null,
        start_date: schoolStartYear ? new Date(schoolStartYear, 0) : null,
        end_date: schoolEndYear ? new Date(schoolEndYear, 0) : null,
        grade: null,
        activites_and_socials: null,
        skills: [],
        description: null,
        media: []
      }],
      work_experience: [{
        title: jobTitle,
        employee_type: employmentType,
        organization: recentCompany,
        is_current: true,
        start_date: new Date(),
        end_date: null,
        location: null,
        description: null,
        location_type: null,
        skills: [],
        media: []
      }],
      organizations: [],
      skills: [],
      liscence_certificates: [],
      industry: null,
      profile_photo: null,
      cover_photo: null,
      resume: null,
      connections: [],
      followers: [],
      following: [],
      privacy_settings: {
        flag_account_status: accountStatusEnum.public,
        flag_who_can_send_you_invitations: invitationsEnum.everyone,
        flag_messaging_requests: true,
        messaging_read_receipts: true
      },
      activity: {
        posts: [],
        reposted_posts: [],
        reacted_posts: [],
        comments: [],
        media: []
      },
      status: statusEnum.finding_new_job,
      blocked: [],
      conversations: [],
      notification: [],
      applied_jobs: [],
      saved_jobs: [],
      sex: null,
      subscription: {
        subscribed: false,
        subscription_started_at: null
      },
      is_student: isStudent,
      is_verified: false,
      is_16_or_above: is16OrAbove
    });
  }

  async update(userId: string, firstName: string, lastName: string, email: string, password: string,
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
  ) {
    // Similarly update the update method to use the correct structure
    return User.findOneAndUpdate(
      { user_id: userId },
      {
        $set: {
          email: email,
          password: password,
          'bio.first_name': firstName,
          'bio.last_name': lastName,
          'bio.location.country_region': country,
          'bio.location.city': city,
          'bio.contact_info.birthday': birthDate,
          is_student: isStudent,
          is_16_or_above: is16OrAbove,
          // Only set these if they're provided
          ...(school && { 'education.0.school': school }),
          ...(schoolStartYear && { 'education.0.start_date': new Date(schoolStartYear, 0) }),
          ...(schoolEndYear && { 'education.0.end_date': new Date(schoolEndYear, 0) }),
          ...(jobTitle && { 'work_experience.0.title': jobTitle }),
          ...(employmentType && { 'work_experience.0.employee_type': employmentType }),
          ...(recentCompany && { 'work_experience.0.organization': recentCompany })
        }
      },
      { new: true, upsert: false }
    );
  }

  async findByEmail(email: string) {
    return User.findOne({ email });
  }

  async findByUserId(id: string) {
    return User.findOne({ user_id: id });
  }

  async createGoogleUser(user_id: string, email: string, firstName: string, lastName: string, password: string) {
    return User.create({
      user_id: user_id,
      email: email,
      bio: {
        first_name: firstName,
        last_name: lastName,
        location: {
          country_region: "",
          city: ""
        },
        contact_info: {
          phone_number: null,
          country_code: null,
          phone_type: null,
          address: null,
          birthday: null,
          website: null
        }
      },
      password: password,
      is_verified: true,
      privacy_settings: {
        flag_account_status: accountStatusEnum.public,
        flag_who_can_send_you_invitations: invitationsEnum.everyone,
        flag_messaging_requests: true,
        messaging_read_receipts: true
      },
      activity: {
        posts: [],
        reposted_posts: [],
        reacted_posts: [],
        comments: [],
        media: []
      },
      status: statusEnum.finding_new_job,
      is_16_or_above: true
    });
  }

  async updateEmail(user_id: string, email: string) {
    return User.updateOne({ user_id: user_id }, { $set: { email: email } });
  }

  async deleteAccount(user_id: string) {
    return User.deleteOne({ user_id: user_id });
  }
}