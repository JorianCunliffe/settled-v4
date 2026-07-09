export type OrganisationType = "union" | "industry-body" | "professional-association";

export const organisationTypes: OrganisationType[] = [
  "union",
  "industry-body",
  "professional-association",
];

export interface MemberOrganisation {
  id: string;
  name: string;
  type: OrganisationType;
  /** Members of partner organisations use Settled free; everyone else pays the monthly fee. */
  partner: boolean;
  notes: string;
  createdAt: string;
}
