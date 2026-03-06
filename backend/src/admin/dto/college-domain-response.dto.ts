export interface CollegeDomainDto {
  id: string;
  domain: string;
  collegeName: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CollegeDomainListResponseDto {
  domains: CollegeDomainDto[];
  total: number;
}
