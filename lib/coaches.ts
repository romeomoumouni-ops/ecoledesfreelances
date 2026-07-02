// Les personnes que les élèves peuvent contacter.

export type Contact = { key: string; name: string; role: string };

export const CONTACTS: Contact[] = [
  { key: 'christian', name: 'Coach Christian', role: 'Coach' },
  { key: 'tobi', name: 'Coach Tobi', role: 'Coach' },
  { key: 'mohamed', name: 'Coach Mohamed', role: 'Coach' },
  { key: 'marianne', name: 'Marianne', role: 'Équipe' },
];

export function contactByKey(key: string): Contact | undefined {
  return CONTACTS.find((c) => c.key === key);
}
