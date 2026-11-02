import { describe, expect, it } from 'vitest';
import { isTechRole, keepJob, opensToAfrica } from './jobs';

describe('opensToAfrica', () => {
  it.each([
    'Worldwide',
    'Anywhere',
    'EMEA,  LATAM',
    'Africa',
    'Nigeria, Kenya',
    'Lagos',
    'Remote',
    'Distributed',
  ])('retient %s', (l) => expect(opensToAfrica(l)).toBe(true));
  it.each([
    'USA',
    'Europe,  USA',
    'Canada,  Israel,  UK',
    'LATAM',
    'Remote - US',
    'Hybrid',
    'Paris, France',
  ])('écarte %s', (l) => expect(opensToAfrica(l)).toBe(false));
});

describe('isTechRole', () => {
  it('garde les métiers du numérique et écarte les autres', () => {
    expect(isTechRole('Senior Backend Engineer')).toBe(true);
    expect(isTechRole('Data Scientist, Growth')).toBe(true);
    expect(isTechRole('Account Executive, FedCiv')).toBe(false);
    expect(isTechRole('First Mile & Last Mile Manager')).toBe(false);
  });

  it.each([
    'Structural Engineer at a Reputable Company',
    'I.T Sales Manager (Cloud) at Fort Knox Outsourcing',
    'Group Product Developer at Velvot',
    'Electrical Engineer',
    'Customer Success Engineer',
  ])('écarte « %s » (pas un métier du logiciel)', (t) => expect(isTechRole(t)).toBe(false));

  it.each([
    'Frontend Developer (React)',
    'DevOps Engineer',
    'Software Engineer II',
    'Machine Learning Engineer',
    'Site Reliability Engineer',
  ])('garde « %s »', (t) => expect(isTechRole(t)).toBe(true));
});

describe('keepJob (sites d’emploi généralistes)', () => {
  it.each([
    'Engineering Intern at Lance Trend Limited',
    'Jobs at Fortis Engineering Services',
    'Security Officer at Abuja Clinics',
    'Contracts Advisor III at Nautilus Nigeria Engineering and Construction',
    'Senior Advanced Chemical Engineer at Honeywell',
  ])('MyJobMag : écarte « %s »', (t) => expect(keepJob('myjobmag', t)).toBe(false));

  it.each(['Android Engineer at FairMoney', 'Backend Developer (Node.js) at Paystack'])(
    'MyJobMag : garde « %s »',
    (t) => expect(keepJob('myjobmag', t)).toBe(true),
  );

  it('les pages carrière des entreprises tech gardent le filtre large', () => {
    expect(keepJob('cloudflare', 'Systems Engineer')).toBe(true);
  });
});
