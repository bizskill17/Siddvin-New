export const normalizeEntity = (raw) => String(raw || '').trim();

export const resolveEntity = (entity) => {
  const e = normalizeEntity(entity);
  switch (e) {
    case 'Properties':
      return { kind: 'generic', table: 'properties' };
    case 'Brands':
      return { kind: 'generic', table: 'brands' };
    case 'Proposals':
      return { kind: 'generic', table: 'proposals' };
    case 'Visits':
      return { kind: 'generic', table: 'visits' };
    case 'FollowUps':
      return { kind: 'generic', table: 'follow_ups' };
    case 'SidvinTeam':
    case 'SidvinTeamMembers':
    case 'Sidvin Team Members':
      return { kind: 'generic', table: 'sidvin_team' };
    case 'CompanyMaster':
      return { kind: 'generic', table: 'company_master' };
    case 'CategoryMaster':
      return { kind: 'generic', table: 'category_master' };
    case 'TermSheets':
      return { kind: 'term', table: 'term_sheets' };
    default:
      return null;
  }
};

