import { HttpClient, httpClient } from '@/core/api/http-client';
import type {
  Certificate,
  CertificateStatus,
  Eligibility,
  Verification,
} from '@/features/certificates/domain/entities';

interface CertificateDto {
  id: string;
  code: string;
  course_title: string;
  holder_name: string;
  issued_at: string | null;
  status: string;
}

interface EligibilityDto {
  met: boolean;
  lessons_total: number;
  lessons_completed: number;
  activities_total: number;
  activities_passed: number;
  missing: string[];
}

interface VerificationDto {
  valid: boolean;
  status: string;
  holder_name: string;
  course_title: string;
  issued_at: string | null;
  revoked_reason: string | null;
}

function toStatus(value: string): CertificateStatus {
  // Anything unrecognized is treated as revoked, not valid. Showing a
  // certificate as good because the client did not understand the status is
  // the one failure mode that actually costs credibility.
  return value === 'valid' ? 'valid' : 'revoked';
}

function toCertificate(dto: CertificateDto): Certificate {
  return {
    id: dto.id,
    code: dto.code,
    courseTitle: dto.course_title,
    holderName: dto.holder_name,
    issuedAt: dto.issued_at,
    status: toStatus(dto.status),
  };
}

export interface CertificateRepository {
  mine(): Promise<Certificate[]>;
  eligibility(slug: string): Promise<Eligibility>;
  issue(slug: string): Promise<Certificate>;
  verify(code: string): Promise<Verification>;
}

export class HttpCertificateRepository implements CertificateRepository {
  constructor(private readonly http: HttpClient = httpClient) {}

  async mine(): Promise<Certificate[]> {
    const rows = await this.http.get<CertificateDto[]>('/certificates/me');
    return rows.map(toCertificate);
  }

  async eligibility(slug: string): Promise<Eligibility> {
    const dto = await this.http.get<EligibilityDto>(
      `/certificates/eligibility/${encodeURIComponent(slug)}`,
    );

    return {
      met: dto.met,
      lessonsTotal: dto.lessons_total,
      lessonsCompleted: dto.lessons_completed,
      activitiesTotal: dto.activities_total,
      activitiesPassed: dto.activities_passed,
      missing: dto.missing,
    };
  }

  async issue(slug: string): Promise<Certificate> {
    return toCertificate(
      await this.http.post<CertificateDto>(`/certificates/${encodeURIComponent(slug)}`),
    );
  }

  async verify(code: string): Promise<Verification> {
    const dto = await this.http.get<VerificationDto>(
      `/certificates/verify/${encodeURIComponent(code)}`,
    );

    return {
      valid: dto.valid,
      status: toStatus(dto.status),
      holderName: dto.holder_name,
      courseTitle: dto.course_title,
      issuedAt: dto.issued_at,
      revokedReason: dto.revoked_reason,
    };
  }
}

export const certificateRepository = new HttpCertificateRepository();
