import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

const translations = {
  en: {
    'app.title': 'Family Tree',
    'app.description': 'Build, explore and preserve your family tree.',
    'app.loading': 'Opening your family archive…',
    'common.language': 'Language',
    'common.cancel': 'Cancel',
    'common.close': 'Close',
    'common.loading': 'Please wait…',
    'common.logout': 'Log out',

    'auth.welcome': 'Welcome back',
    'auth.startStory': 'Start your family story',
    'auth.signInLede': 'Sign in to explore and grow your family archive.',
    'auth.registerLede':
      'Create a private space for the people, dates and stories that matter.',
    'auth.signIn': 'Sign in',
    'auth.createAccount': 'Create account',
    'auth.yourName': 'Your name',
    'auth.namePlaceholder': 'Alex Doe',
    'auth.email': 'Email address',
    'auth.emailPlaceholder': 'you@example.com',
    'auth.password': 'Password',
    'auth.passwordPlaceholder': 'At least 6 characters',
    'auth.createTree': 'Create my family tree',
    'auth.footnote': 'Every account keeps its own family tree private.',

    'tree.signedInAs': 'Signed in as',
    'tree.eyebrow': 'Your family archive',
    'tree.heroTitle': 'Every name is a story worth keeping.',
    'tree.heroCopy':
      'Add relatives, connect generations and watch your family tree grow. Everything you create here is private to your account.',
    'tree.addPerson': 'Add person',
    'tree.loadDemo': 'Load example family',
    'stats.people': 'People in the tree',
    'stats.generations.one': 'Generation',
    'stats.generations.other': 'Generations',
    'stats.roots.one': 'Family root',
    'stats.roots.other': 'Family roots',
    'tree.heading': 'Family tree',
    'tree.headingHint': 'Use the + button on a card to add a child.',
    'tree.addRoot': 'Add another root',
    'tree.loading': 'Growing your tree…',
    'tree.dismissError': 'Dismiss error',

    'empty.title': 'Your tree is waiting for its first name',
    'empty.copy':
      'Start with yourself, a parent or an ancestor. You can connect the rest of the family from there.',
    'empty.addFirst': 'Add the first person',
    'empty.explore': 'Explore with example data',

    'notice.personAdded': 'Person added.',
    'notice.personUpdated': 'Person updated.',
    'notice.personDeleted': 'Person removed from the tree.',
    'notice.demoLoaded': 'Example family loaded.',

    'confirm.delete':
      'Delete {{name}}? Any children below this person will also be removed.',
    'confirm.demo':
      'Loading the example family will replace the people currently in your tree. Continue?',

    'person.born': 'Born {{date}}',
    'person.died': 'Died {{date}}',
    'person.datesUnknown': 'Dates not added',
    'person.spouseLabel': 'Spouse or partner: {{name}}',
    'person.addChild': 'Add a child of {{name}}',
    'person.addChildTitle': 'Add child',
    'person.edit': 'Edit {{name}}',
    'person.editTitle': 'Edit person',
    'person.delete': 'Delete {{name}}',
    'person.deleteTitle': 'Delete person',

    'modal.updateDetails': 'Update details',
    'modal.newRelative': 'New relative',
    'modal.editTitle': 'Edit {{name}}',
    'modal.addChild': 'Add a child',
    'modal.addPerson': 'Add a person',
    'modal.firstName': 'First name *',
    'modal.firstNamePlaceholder': 'Maria',
    'modal.lastName': 'Last name',
    'modal.lastNamePlaceholder': 'Doe',
    'modal.gender': 'Gender',
    'modal.genderUnknown': 'Not specified',
    'modal.genderFemale': 'Female',
    'modal.genderMale': 'Male',
    'modal.genderOther': 'Other',
    'modal.parent': 'Parent in this tree',
    'modal.noParent': 'No parent / family root',
    'modal.birth': 'Birth date or year',
    'modal.birthPlaceholder': 'e.g. 1945 or 1945-06-12',
    'modal.death': 'Death date or year',
    'modal.deathPlaceholder': 'Leave empty if living',
    'modal.spouse': 'Spouse or partner',
    'modal.spousePlaceholder': 'Name shown beside this person',
    'modal.notes': 'Notes and memories',
    'modal.notesPlaceholder':
      'A story, occupation, place, or anything worth remembering…',
    'modal.save': 'Save changes',
    'modal.saving': 'Saving…',
    'modal.addToTree': 'Add to tree',

    'errors.generic': 'Something went wrong. Please try again.',
    'errors.loadTree':
      'Could not load your family tree. Please try again.',
    'errors.savePerson':
      'Could not save this person. Please try again.',
    'errors.deletePerson': 'Could not delete this person.',
    'errors.loadDemo': 'Could not load the example family.',

    'api.authRequired': 'Authentication required.',
    'api.accountGone': 'This account no longer exists.',
    'api.invalidSession': 'Your session expired. Please sign in again.',
    'api.fieldsRequired': 'Name, email and password are required.',
    'api.invalidEmail': 'Please enter a valid email address.',
    'api.passwordLength': 'Password must be at least 6 characters.',
    'api.emailExists': 'An account with this email already exists.',
    'api.emailPasswordRequired': 'Email and password are required.',
    'api.badCredentials': 'Incorrect email or password.',
    'api.invalidParent': 'Invalid parent.',
    'api.parentNotFound': 'Parent not found.',
    'api.ownParent': 'A person cannot be their own parent.',
    'api.loop': 'This relationship would create a loop in the tree.',
    'api.firstNameRequired': 'First name is required.',
    'api.personNotFound': 'Person not found.',
    'api.notFound': 'Route not found.',
    'api.database': 'Database connection failed.',
    'api.inUse': 'That value is already in use.',
    'api.server': 'Internal server error.',
  },
  lt: {
    'app.title': 'Šeimos medis',
    'app.description': 'Kurkite, tyrinėkite ir saugokite savo šeimos medį.',
    'app.loading': 'Atidaromas jūsų šeimos archyvas…',
    'common.language': 'Kalba',
    'common.cancel': 'Atšaukti',
    'common.close': 'Uždaryti',
    'common.loading': 'Palaukite…',
    'common.logout': 'Atsijungti',

    'auth.welcome': 'Sveiki sugrįžę',
    'auth.startStory': 'Pradėkite savo šeimos istoriją',
    'auth.signInLede':
      'Prisijunkite, kad galėtumėte tyrinėti ir auginti savo šeimos archyvą.',
    'auth.registerLede':
      'Sukurkite privačią erdvę žmonėms, datoms ir istorijoms, kurios svarbios.',
    'auth.signIn': 'Prisijungti',
    'auth.createAccount': 'Susikurti paskyrą',
    'auth.yourName': 'Jūsų vardas',
    'auth.namePlaceholder': 'Aleksas Petrauskas',
    'auth.email': 'El. pašto adresas',
    'auth.emailPlaceholder': 'jus@example.com',
    'auth.password': 'Slaptažodis',
    'auth.passwordPlaceholder': 'Bent 6 simboliai',
    'auth.createTree': 'Sukurti mano šeimos medį',
    'auth.footnote': 'Kiekviena paskyra saugo savo šeimos medį privačiai.',

    'tree.signedInAs': 'Prisijungta kaip',
    'tree.eyebrow': 'Jūsų šeimos archyvas',
    'tree.heroTitle': 'Kiekvienas vardas – istorija, kurią verta išsaugoti.',
    'tree.heroCopy':
      'Pridėkite giminaičių, sujunkite kartas ir stebėkite, kaip auga jūsų šeimos medis. Viskas, ką sukuriate čia, matoma tik jums.',
    'tree.addPerson': 'Pridėti asmenį',
    'tree.loadDemo': 'Įkelti pavyzdinę šeimą',
    'stats.people': 'Žmonės medyje',
    'stats.generations.one': 'Karta',
    'stats.generations.few': 'Kartos',
    'stats.generations.many': 'Kartų',
    'stats.roots.one': 'Šeimos šaknis',
    'stats.roots.few': 'Šeimos šaknys',
    'stats.roots.many': 'Šeimos šaknų',
    'tree.heading': 'Šeimos medis',
    'tree.headingHint':
      'Spustelėkite „+“ kortelėje, kad pridėtumėte vaiką.',
    'tree.addRoot': 'Pridėti dar vieną šaknį',
    'tree.loading': 'Auginamas jūsų medis…',
    'tree.dismissError': 'Uždaryti klaidos pranešimą',

    'empty.title': 'Jūsų medis laukia pirmo vardo',
    'empty.copy':
      'Pradėkite nuo savęs, tėvų ar protėvio. Nuo jų galėsite prijungti likusią šeimą.',
    'empty.addFirst': 'Pridėti pirmą asmenį',
    'empty.explore': 'Išbandyti su pavyzdiniais duomenimis',

    'notice.personAdded': 'Asmuo pridėtas.',
    'notice.personUpdated': 'Asmens duomenys atnaujinti.',
    'notice.personDeleted': 'Asmuo pašalintas iš medžio.',
    'notice.demoLoaded': 'Pavyzdinė šeima įkelta.',

    'confirm.delete':
      'Pašalinti {{name}}? Visi šio asmens vaikai taip pat bus pašalinti.',
    'confirm.demo':
      'Įkėlus pavyzdinę šeimą, dabartiniai jūsų medžio žmonės bus pakeisti. Tęsti?',

    'person.born': 'Gimė {{date}}',
    'person.died': 'Mirė {{date}}',
    'person.datesUnknown': 'Datos nenurodytos',
    'person.spouseLabel': 'Sutuoktinis (-ė) arba partneris (-ė): {{name}}',
    'person.addChild': 'Pridėti {{name}} vaiką',
    'person.addChildTitle': 'Pridėti vaiką',
    'person.edit': 'Redaguoti {{name}}',
    'person.editTitle': 'Redaguoti asmenį',
    'person.delete': 'Pašalinti {{name}}',
    'person.deleteTitle': 'Pašalinti asmenį',

    'modal.updateDetails': 'Atnaujinti duomenis',
    'modal.newRelative': 'Naujas giminaitis',
    'modal.editTitle': 'Redaguoti {{name}}',
    'modal.addChild': 'Pridėti vaiką',
    'modal.addPerson': 'Pridėti asmenį',
    'modal.firstName': 'Vardas *',
    'modal.firstNamePlaceholder': 'Marija',
    'modal.lastName': 'Pavardė',
    'modal.lastNamePlaceholder': 'Petrauskas',
    'modal.gender': 'Lytis',
    'modal.genderUnknown': 'Nepasakyta',
    'modal.genderFemale': 'Moteris',
    'modal.genderMale': 'Vyras',
    'modal.genderOther': 'Kita',
    'modal.parent': 'Tėvai medyje',
    'modal.noParent': 'Nėra tėvų / šeimos šaknis',
    'modal.birth': 'Gimimo data arba metai',
    'modal.birthPlaceholder': 'pvz., 1945 arba 1945-06-12',
    'modal.death': 'Mirties data arba metai',
    'modal.deathPlaceholder': 'Palikite tuščią, jei asmuo gyvas',
    'modal.spouse': 'Sutuoktinis (-ė) arba partneris (-ė)',
    'modal.spousePlaceholder': 'Vardas rodomas prie šio asmens',
    'modal.notes': 'Užrašai ir prisiminimai',
    'modal.notesPlaceholder':
      'Istorija, profesija, vieta ar bet kas, ką verta prisiminti…',
    'modal.save': 'Išsaugoti pakeitimus',
    'modal.saving': 'Išsaugoma…',
    'modal.addToTree': 'Pridėti į medį',

    'errors.generic': 'Kažkas nepavyko. Bandykite dar kartą.',
    'errors.loadTree': 'Nepavyko įkelti šeimos medžio. Bandykite dar kartą.',
    'errors.savePerson':
      'Nepavyko išsaugoti šio asmens. Bandykite dar kartą.',
    'errors.deletePerson': 'Nepavyko pašalinti šio asmens.',
    'errors.loadDemo': 'Nepavyko įkelti pavyzdinės šeimos.',

    'api.authRequired': 'Reikia prisijungti.',
    'api.accountGone': 'Ši paskyra nebėra.',
    'api.invalidSession': 'Sesija baigėsi. Prisijunkite dar kartą.',
    'api.fieldsRequired':
      'Būtina įvesti vardą, el. paštą ir slaptažodį.',
    'api.invalidEmail': 'Įveskite galiojantį el. pašto adresą.',
    'api.passwordLength': 'Slaptažodis turi būti bent 6 simbolių.',
    'api.emailExists': 'Paskyra su šiuo el. paštu jau egzistuoja.',
    'api.emailPasswordRequired':
      'Būtina įvesti el. paštą ir slaptažodį.',
    'api.badCredentials': 'Neteisingas el. paštas arba slaptažodis.',
    'api.invalidParent': 'Netinkamas tėvų įrašas.',
    'api.parentNotFound': 'Tėvų įrašas nerastas.',
    'api.ownParent': 'Asmuo negali būti savo paties tėvu ar motina.',
    'api.loop': 'Šis ryšys sukurtų ciklą šeimos medyje.',
    'api.firstNameRequired': 'Būtina įvesti vardą.',
    'api.personNotFound': 'Asmuo nerastas.',
    'api.notFound': 'Nuoroda nerasta.',
    'api.database': 'Nepavyko prisijungti prie duomenų bazės.',
    'api.inUse': 'Ši reikšmė jau naudojama.',
    'api.server': 'Vidinė serverio klaida.',
  },
};

const API_ERROR_KEYS = {
  'Authentication required': 'api.authRequired',
  'Account no longer exists': 'api.accountGone',
  'Invalid or expired session': 'api.invalidSession',
  'Name, email and password are required': 'api.fieldsRequired',
  'Please enter a valid email address': 'api.invalidEmail',
  'Password must be at least 6 characters': 'api.passwordLength',
  'An account with this email already exists': 'api.emailExists',
  'Email and password are required': 'api.emailPasswordRequired',
  'Incorrect email or password': 'api.badCredentials',
  'Invalid parent': 'api.invalidParent',
  'Parent not found': 'api.parentNotFound',
  'A person cannot be their own parent': 'api.ownParent',
  'This relationship would create a loop in the tree': 'api.loop',
  'First name is required': 'api.firstNameRequired',
  'Person not found': 'api.personNotFound',
  'Route not found': 'api.notFound',
  'Database connection failed': 'api.database',
  'That value is already in use': 'api.inUse',
  'Internal server error': 'api.server',
};

const LanguageContext = createContext(null);

function interpolate(text, values) {
  if (!values) return text;
  return text.replace(/\{\{(\w+)\}\}/g, (_match, key) =>
    values[key] == null ? '' : String(values[key])
  );
}

function pluralCategory(language, count) {
  if (language === 'lt') {
    const lastDigit = count % 10;
    const lastTwoDigits = count % 100;
    if (lastDigit === 1 && lastTwoDigits !== 11) return 'one';
    if (
      lastDigit >= 2 &&
      lastDigit <= 9 &&
      !(lastTwoDigits >= 11 && lastTwoDigits <= 19)
    ) {
      return 'few';
    }
    return 'many';
  }

  return count === 1 ? 'one' : 'other';
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      const saved = localStorage.getItem('familyTreeLanguage');
      return translations[saved] ? saved : 'en';
    } catch (_error) {
      return 'en';
    }
  });

  const setLanguage = useCallback((nextLanguage) => {
    if (translations[nextLanguage]) {
      setLanguageState(nextLanguage);
    }
  }, []);

  const t = useCallback(
    (key, values) =>
      interpolate(
        translations[language]?.[key] ?? translations.en[key] ?? key,
        values
      ),
    [language]
  );

  const tn = useCallback(
    (key, count, values) =>
      t(`${key}.${pluralCategory(language, count)}`, {
        ...values,
        count,
      }),
    [language, t]
  );

  const translateApiError = useCallback(
    (error, fallbackKey) => {
      const message = error?.response?.data?.error;
      const mappedKey = message ? API_ERROR_KEYS[message] : null;

      if (mappedKey) return t(mappedKey);
      if (language === 'lt') return t(fallbackKey);
      return message || t(fallbackKey);
    },
    [language, t]
  );

  useEffect(() => {
    try {
      localStorage.setItem('familyTreeLanguage', language);
    } catch (_error) {
      // Language still works for this session when storage is unavailable.
    }

    document.documentElement.lang = language;
    document.title = t('app.title');
    const description = document.querySelector('meta[name="description"]');
    if (description) {
      description.setAttribute('content', t('app.description'));
    }
  }, [language, t]);

  const value = useMemo(
    () => ({ language, setLanguage, t, tn, translateApiError }),
    [language, setLanguage, t, tn, translateApiError]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useI18n must be used inside LanguageProvider');
  }
  return context;
}
