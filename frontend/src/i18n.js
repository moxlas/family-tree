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
    'common.save': 'Save',
    'common.delete': 'Delete',
    'date.pick': 'Pick a date from the calendar',

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
    'tree.collapseHero': 'Hide archive banner',
    'tree.expandHero': 'Show archive banner',
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
    'tree.homePerson': 'Home person',
    'tree.homePersonHint':
      'The tree shows this person’s ancestors and their descendants.',
    'tree.headingHint':
      'Use + on a card to add a child, parent or sibling. Spouse cards are hidden in this view.',
    'tree.headingHintSpouses':
      'Use + on a card to add a child, parent, sibling or spouse. Use ▾ to hide that person’s children only.',
    'tree.modeBloodline': 'Spouses hidden',
    'tree.modeSpouses': 'Spouses shown',
    'tree.addRoot': 'Add another root',
    'tree.zoom': 'Tree zoom',
    'tree.zoomReset': 'Reset',
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
    'notice.treeCreated': 'Tree created.',
    'notice.treeRenamed': 'Tree renamed.',
    'notice.homePersonSet': 'Home person updated.',
    'notice.treeDeleted': 'Tree deleted.',
    'notice.gedcomExported': 'GEDCOM file exported.',

    'confirm.delete':
      'Delete {{name}}? Any children below this person will also be removed.',
    'confirm.demo':
      'Loading the example family will replace the people currently in this tree. Continue?',
    'confirm.deleteTree':
      'Delete the tree “{{name}}” and all {{count}} people in it? This cannot be undone.',

    'person.born': 'Born {{date}}',
    'person.died': 'Died {{date}}',
    'person.deceased': 'Deceased',
    'person.deceasedMale': 'Deceased',
    'person.deceasedFemale': 'Deceased',
    'person.hideChildren': 'Hide children',
    'person.showChildren': 'Show children',
    'person.noChildren': 'This person has no children',
    'person.hideChildrenAria': 'Hide the children of {{name}}',
    'person.showChildrenAria': 'Show the children of {{name}}',
    'person.homeBadge': 'Home',
    'person.homePerson': 'Home person',
    'person.datesUnknown': 'Dates not added',
    'person.spouseLabel': 'Spouse or partner: {{name}}',
    'person.addChild': 'Add a child of {{name}}',
    'person.addChildTitle': 'Add child',
    'person.addParent': 'Add a parent of {{name}}',
    'person.addParentTitle': 'Add parent',
    'person.addSibling': 'Add a sibling of {{name}}',
    'person.addSiblingTitle': 'Add sibling',
    'person.addRelative': 'Add a relative of {{name}}',
    'person.addRelativeTitle': 'Add family member',
    'person.addSpouse': 'Add a spouse of {{name}}',
    'person.addSpouseTitle': 'Add spouse',
    'person.edit': 'Edit {{name}}',
    'person.editTitle': 'Edit person',
    'person.delete': 'Delete {{name}}',
    'person.deleteTitle': 'Delete person',
    'person.viewDetails': 'View details',

    'details.eyebrow': 'Person details',
    'details.title': 'About {{name}}',
    'details.gender': 'Gender',
    'details.status': 'Status',
    'details.birth': 'Born',
    'details.previousName': 'Maiden / previous last name',
    'details.death': 'Death date or year',
    'details.currentSpouse': 'Current spouse or partner',
    'details.previousSpouses': 'Previous spouses or partners',
    'details.spouse': 'Spouse or partner',
    'details.parent': 'Parents in this tree',
    'details.children': 'Children in this tree',
    'details.notes': 'Notes and memories',
    'details.noNotes': 'No notes yet.',
    'details.close': 'Close',
    'details.relationTo': '{{relation}} of {{name}}',
    'relation.homePerson': 'Home person',
    'relation.branchPerson': 'Branch person',
    'relation.self': 'This person',
    'relation.father': 'Father',
    'relation.mother': 'Mother',
    'relation.parent': 'Parent',
    'relation.son': 'Son',
    'relation.daughter': 'Daughter',
    'relation.child': 'Child',
    'relation.brother': 'Brother',
    'relation.sister': 'Sister',
    'relation.sibling': 'Sibling',
    'relation.halfBrother': 'Half-brother',
    'relation.halfSister': 'Half-sister',
    'relation.halfSibling': 'Half-sibling',
    'relation.grandfather': 'Grandfather',
    'relation.grandmother': 'Grandmother',
    'relation.grandparent': 'Grandparent',
    'relation.grandson': 'Grandson',
    'relation.granddaughter': 'Granddaughter',
    'relation.grandchild': 'Grandchild',
    'relation.greatGrandfather': 'Great-grandfather',
    'relation.greatGrandmother': 'Great-grandmother',
    'relation.greatGrandparent': 'Great-grandparent',
    'relation.greatGrandson': 'Great-grandson',
    'relation.greatGranddaughter': 'Great-granddaughter',
    'relation.greatGrandchild': 'Great-grandchild',
    'relation.uncle': 'Uncle',
    'relation.aunt': 'Aunt',
    'relation.auntOrUncle': 'Aunt or uncle',
    'relation.nephew': 'Nephew',
    'relation.niece': 'Niece',
    'relation.nephewOrNiece': 'Nephew or niece',
    'relation.cousinMale': 'Cousin',
    'relation.cousinFemale': 'Cousin',
    'relation.cousin': 'Cousin',
    'relation.cousinSon': 'Son of a cousin',
    'relation.cousinDaughter': 'Daughter of a cousin',
    'relation.cousinChild': 'Child of a cousin',
    'relation.cousinSonFemale': 'Son of a cousin',
    'relation.cousinDaughterFemale': 'Daughter of a cousin',
    'relation.cousinChildFemale': 'Child of a cousin',
    'relation.cousinSonMale': 'Son of a cousin',
    'relation.cousinDaughterMale': 'Daughter of a cousin',
    'relation.cousinChildMale': 'Child of a cousin',
    'relation.greatNephew': 'Great-nephew',
    'relation.greatNiece': 'Great-niece',
    'relation.greatNephewOrNiece': 'Great-nephew or great-niece',
    'relation.parentCousin': 'Cousin of a parent',
    'relation.husband': 'Husband',
    'relation.wife': 'Wife',
    'relation.partner': 'Partner',
    'relation.exHusband': 'Ex-husband',
    'relation.exWife': 'Ex-wife',
    'relation.exPartner': 'Ex-partner',
    'relation.spouseOf': '{{relation}}’s {{spouse}}',
    'relation.fatherInLaw': 'Father-in-law',
    'relation.motherInLaw': 'Mother-in-law',
    'relation.parentInLaw': 'Parent-in-law',
    'relation.brotherInLaw': 'Brother-in-law',
    'relation.sisterInLaw': 'Sister-in-law',
    'relation.siblingInLaw': 'Sibling-in-law',
    'relation.stepFather': 'Stepfather',
    'relation.stepMother': 'Stepmother',
    'relation.stepParent': 'Step-parent',
    'relation.stepSon': 'Stepson',
    'relation.stepDaughter': 'Stepdaughter',
    'relation.stepChild': 'Stepchild',
    'relation.stepBrother': 'Stepbrother',
    'relation.stepSister': 'Stepsister',
    'relation.stepSibling': 'Step-sibling',
    'relation.relative': 'Relative',
    'relation.relativeByMarriage': 'Relative by marriage',
    'relation.ancestor': 'Ancestor',
    'relation.descendant': 'Descendant',
    'modal.updateDetails': 'Update details',
    'modal.newRelative': 'New relative',
    'modal.editTitle': 'Edit {{name}}',
    'modal.addChild': 'Add a child',
    'modal.addParentTitle': 'Add a parent',
    'modal.addSiblingTitle': 'Add a sibling',
    'modal.addPerson': 'Add a person',
    'modal.addSpouseTitle': 'Add a spouse',
    'modal.firstName': 'First name *',
    'modal.firstNamePlaceholder': 'Maria',
    'modal.lastName': 'Last name',
    'modal.lastNamePlaceholder': 'Doe',
    'modal.gender': 'Gender',
    'modal.genderUnknown': 'Not specified',
    'modal.genderFemale': 'Female',
    'modal.genderMale': 'Male',
    'modal.genderOther': 'Other',
    'modal.father': 'Father in this tree',
    'modal.mother': 'Mother in this tree',
    'modal.noFather': 'No father linked',
    'modal.noMother': 'No mother linked',
    'modal.previousName': 'Maiden / previous last name',
    'modal.previousNamePlaceholder': 'e.g. Strumskytė',
    'modal.previousNameHint':
      'The surname this person used before, such as a maiden name.',
    'modal.birth': 'Birth date or year',
    'modal.birthPlaceholder': 'e.g. 1945 or 16 JAN 1991',
    'modal.birthPlace': 'Birth place',
    'modal.birthPlacePlaceholder': 'e.g. Kaunas, Lithuania',
    'modal.death': 'Death date or year',
    'modal.deathPlaceholder': 'Leave empty if living',
    'modal.dateHint':
      'Type a year (1945), a month and year (JUN 1945) or a full date (16 JAN 1991), or pick one from the calendar.',
    'modal.deceased': 'Deceased',
    'modal.deceasedHint':
      'Mark this if the person has died, even when the date is unknown.',
    'modal.linkedSpouse': 'Spouse already in the tree',
    'modal.noLinkedSpouse': 'No linked spouse',
    'modal.linkedSpouseHint':
      'Link an existing person to show them as a separate connected card.',
    'modal.currentSpouse': 'Current spouse or partner',
    'modal.noCurrentSpouse': 'No current partner',
    'modal.partner': 'Spouse or partner',
    'modal.addPreviousSpouse': 'Add spouse or partner',
    'modal.previousSpouseBlock': 'Previous spouse or partner',
    'modal.noPreviousSpouse': 'Select previous partner',
    'modal.removeRelationship': 'Remove',
    'modal.relationshipDatePlaceholder': 'e.g. 1991 or 16 JAN 1991',
    'modal.relationshipPlacePlaceholder': 'e.g. Kaunas, Lithuania',
    'modal.marriageDate': 'Marriage date',
    'modal.marriagePlace': 'Marriage place',
    'modal.engagementDate': 'Engagement date',
    'modal.engagementPlace': 'Engagement place',
    'modal.meetingDate': 'Meeting date',
    'modal.meetingPlace': 'Meeting place',
    'modal.divorceDate': 'Divorce date',
    'modal.separationDate': 'Separation date',
    'modal.currentSpouseHint':
      'Choose the person currently married to or partnered with this person.',
    'modal.previousSpouses': 'Previous spouses or partners',
    'modal.previousSpousesHint':
      'Hold Ctrl or Cmd to select several. Previous partners are shown with a broken heart and dashed connection.',
    'modal.previousSpousesEmpty':
      'No other people in the tree can be marked as previous partners yet.',
    'modal.spouseStatus': 'Relationship status',
    'relationship.married': 'Married',
    'relationship.partner': 'Partner',
    'relationship.engaged': 'Engaged',
    'relationship.divorced': 'Divorced',
    'relationship.widowed': 'Widowed',
    'relationship.widowedFemale': 'Widowed',
    'relationship.separated': 'Separated',
    'modal.spouseStatusCurrent': 'Current spouse or partner',
    'modal.spouseStatusFormer': 'Former spouse or partner',
    'modal.spouse': 'Spouse or partner name (optional)',
    'modal.spousePlaceholder': 'Name shown beside this person',
    'modal.spouseHint':
      'Only used when no spouse is linked in the tree; otherwise the linked spouse supplies the name.',
    'modal.notes': 'Notes and memories',
    'modal.notesPlaceholder':
      'A story, occupation, place, or anything worth remembering…',
    'modal.save': 'Save changes',
    'modal.saving': 'Saving…',
    'modal.addToTree': 'Add to tree',

    'trees.active': 'Active tree',
    'trees.manage': 'Manage trees',
    'trees.manageEyebrow': 'Your archive',
    'trees.manageTitle': 'Family trees',
    'trees.manageCopy':
      'Keep different family lines separate. Imports and new people go into the tree you open here.',
    'trees.currentBadge': 'Open',
    'trees.open': 'Open',
    'trees.rename': 'Rename',
    'trees.delete': 'Delete',
    'trees.createTitle': 'Create a new tree',
    'trees.createCopy':
      'Start empty, then add people or import a GEDCOM file.',
    'trees.name': 'Tree name',
    'trees.namePlaceholder': 'e.g. Petrauskas family',
    'trees.create': 'Create tree',
    'trees.creating': 'Creating…',
    'trees.save': 'Save name',
    'trees.saving': 'Saving…',
    'trees.cancelRename': 'Cancel',
    'trees.renameLabel': 'New name for {{name}}',
    'trees.lastTreeHint':
      'You need at least one tree. Rename this one instead of deleting it.',
    'trees.people.one': '{{count}} person',
    'trees.people.few': '{{count}} people',
    'trees.people.many': '{{count}} people',
    'trees.people.other': '{{count}} people',

    'gedcom.import': 'Import GEDCOM',
    'gedcom.export': 'Export GEDCOM',
    'gedcom.importTitle': 'Import a GEDCOM file',
    'gedcom.eyebrow': 'Family data',
    'gedcom.chooseFile': 'Choose a .ged file',
    'gedcom.fileHint':
      'GEDCOM 5.5.1 files from Ancestry, MyHeritage, Gramps or another family tree app.',
    'gedcom.selectedFile': 'Selected file: {{name}}',
    'gedcom.mergeHint':
      'This import merges into “{{tree}}”. Existing people are matched by name and birth year, and missing details are filled in.',
    'gedcom.changeFile': 'Choose another file',
    'gedcom.reading': 'Reading file…',
    'gedcom.previewTitle': 'Ready to import',
    'gedcom.previewCopy':
      'Review what was found before adding it to this tree.',
    'gedcom.individuals': 'Individuals',
    'gedcom.families': 'Families',
    'gedcom.notes': 'With notes',
    'gedcom.dated': 'With dates',
    'gedcom.warnings': 'Warnings',
    'gedcom.noWarnings': 'No warnings — this file looks good.',
    'gedcom.warningCount.one': '{{count}} warning',
    'gedcom.warningCount.few': '{{count}} warnings',
    'gedcom.warningCount.many': '{{count}} warnings',
    'gedcom.warningCount.other': '{{count}} warnings',
    'gedcom.moreWarnings': '…and {{count}} more.',
    'gedcom.importing': 'Importing…',
    'gedcom.doImport': 'Import into this tree',
    'gedcom.resultTitle': 'Import complete',
    'gedcom.resultCopy':
      '“{{tree}}” now includes the imported family data.',
    'gedcom.created': 'People added',
    'gedcom.updated': 'People merged',
    'gedcom.spouseLinks': 'Spouse links added',
    'gedcom.parentLinks': 'Parent links added',
    'gedcom.done': 'Done',
    'gedcom.importAnother': 'Import another file',
    'gedcom.parseError': 'This file could not be read as GEDCOM 5.5.1.',
    'gedcom.noPeople': 'No people were found in this GEDCOM file.',
    'gedcom.tooMany':
      'This file has {{count}} people. Up to {{max}} people can be imported at once.',
    'gedcom.fileTooLarge': 'Please choose a file smaller than 20 MB.',
    'gedcom.warn.missingName':
      'An individual without a first name was skipped.',
    'gedcom.warn.duplicateReference':
      'A duplicate reference ({{ref}}) was skipped.',
    'gedcom.warn.unknownReference':
      'A family reference ({{ref}}) was not found and was skipped.',
    'gedcom.warn.ambiguousMatch':
      'Several existing people match {{name}}, so a new person was added instead.',
    'gedcom.warn.spouseConflict':
      'The spouse link between {{person}} and {{spouse}} was skipped because one of them already has a different spouse.',
    'gedcom.warn.parentConflict':
      '{{person}} already has a different parent, so {{parent}} was not linked.',
    'gedcom.warn.fieldConflict':
      'Kept your existing details for {{person}} where they differ from the imported file.',
    'gedcom.warn.cycle':
      'A parent link for {{person}} was skipped because it would create a loop.',
    'gedcom.warn.multipleParentFamilies':
      '{{count}} people appear in more than one family as a child; only the first parent link is kept.',
    'gedcom.warn.multipleSpouseFamilies':
      '{{count}} people appear in more than one family as a spouse; only one spouse link is kept.',
    'gedcom.warn.twoParentFamily':
      '{{count}} families have two parents. This app keeps one parent per person, so children are linked to the first parent.',
    'gedcom.warn.unsupportedVersion':
      'This file reports GEDCOM {{version}}; only GEDCOM 5.5.1 is fully supported.',
    'gedcom.warn.unsupportedEncoding':
      'This file uses {{encoding}} encoding. Export it as UTF-8 for the most reliable names.',
    'gedcom.warn.malformedLines': '{{count}} malformed lines were skipped.',
    'gedcom.warn.tooManyIndividuals':
      'Only the first {{count}} people can be imported at once.',

    'errors.generic': 'Something went wrong. Please try again.',
    'errors.loadTree':
      'Could not load your family tree. Please try again.',
    'errors.savePerson':
      'Could not save this person. Please try again.',
    'errors.deletePerson': 'Could not delete this person.',
    'errors.loadDemo': 'Could not load the example family.',
    'errors.saveProfile': 'Could not save your profile. Please try again.',
    'errors.saveSettings':
      'Could not save your preferences. Please try again.',
    'errors.loadTrees':
      'Could not load your family trees. Please try again.',
    'errors.createTree': 'Could not create this tree. Please try again.',
    'errors.renameTree': 'Could not rename this tree. Please try again.',
    'errors.deleteTree': 'Could not delete this tree. Please try again.',
    'errors.homePerson': 'Could not change the home person. Please try again.',
    'errors.importGedcom':
      'Could not import this GEDCOM file. Please try again.',

    'settings.openSettings': 'Open profile and settings',
    'settings.eyebrow': 'Your account',
    'settings.title': 'Profile and settings',
    'settings.profileTitle': 'Profile',
    'settings.profileCopy': 'Update the name and email used to sign in.',
    'settings.name': 'Name',
    'settings.email': 'Email address',
    'settings.saveProfile': 'Save profile',
    'settings.savingProfile': 'Saving…',
    'settings.profileSaved': 'Profile updated.',
    'settings.preferencesTitle': 'Tree preferences',
    'settings.bloodlineOnly': 'Bloodline-only tree',
    'settings.bloodlineOnlyHint':
      'When off (the default), spouses appear as separate connected cards with their own parents and children.',
    'settings.modeBloodlineNote':
      'Bloodline view is on. Spouses are shown as names on the same card.',
    'settings.modeSpouseNote':
      'Spouse cards are on. Each spouse has their own card and relationships.',
    'settings.savingPreferences': 'Saving preferences…',
    'settings.bloodlineEnabledNotice': 'Bloodline-only tree enabled.',
    'settings.spouseModeEnabledNotice': 'Separate spouse cards enabled.',
    'settings.showFormerSpouses': 'Show former spouses',
    'settings.showFormerSpousesHint':
      'When off, ex-spouses are hidden and children stay connected to the current parent.',
    'settings.showFormerSpousesNotice': 'Former spouses are shown.',
    'settings.hideFormerSpousesNotice': 'Former spouses are hidden.',
    'settings.accountTitle': 'Account',
    'settings.memberSince': 'Member since',
    'settings.privacy': 'Privacy',
    'settings.privateTree': 'Your tree is private to this account.',
    'settings.unknownDate': 'Unknown',

    'branch.hideChildren': 'Hide children',
    'branch.showChild': 'Show 1 child',
    'branch.showChildren': 'Show {{count}} children',
    'branch.focus': 'Show only this branch',
    'branch.focusHasFamily': 'Open this family branch',
    'branch.focusAria': 'Show only the branch of {{name}}',
    'branch.focusBanner': 'Showing the branch of {{name}}',
    'branch.focusHint':
      'This view shows their whole bloodline — ancestors, uncles, aunts, cousins and descendants — with their spouses.',
    'branch.fullTreeNote':
      'A spouse’s own parents and family appear in their branch — open it with ◎.',
    'branch.backToFull': 'Back to full tree',

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
    'api.invalidSpouse': 'Invalid spouse.',
    'api.spouseNotFound': 'Spouse not found.',
    'api.ownSpouse': 'A person cannot be their own spouse.',
    'api.firstNameRequired': 'First name is required.',
    'api.personNotFound': 'Person not found.',
    'api.treeNotFound': 'Family tree not found.',
    'api.treeNameRequired': 'Tree name is required.',
    'api.treeNameExists': 'A tree with this name already exists.',
    'api.lastTree': 'You need at least one tree.',
    'api.gedcomEmpty': 'No GEDCOM data to import.',
    'api.gedcomTooMany': 'This GEDCOM file contains too many people.',
    'api.gedcomInvalid': 'Invalid GEDCOM data.',
    'api.gedcomTooLarge': 'The import file is too large.',
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
    'common.save': 'Išsaugoti',
    'common.delete': 'Ištrinti',
    'date.pick': 'Pasirinkti datą iš kalendoriaus',

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
    'tree.collapseHero': 'Slėpti archyvo antraštę',
    'tree.expandHero': 'Rodyti archyvo antraštę',
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
    'tree.homePerson': 'Pagrindinis asmuo',
    'tree.homePersonHint':
      'Medis rodo šio asmens protėvius ir jų palikuonis.',
    'tree.headingHint':
      'Spustelėkite „+“ kortelėje, kad pridėtumėte vaiką, tėvą ar motiną, brolį ar seserį. Šiame vaizde sutuoktinių kortelės nerodomos.',
    'tree.headingHintSpouses':
      'Spustelėkite „+“ kortelėje, kad pridėtumėte vaiką, tėvą ar motiną, brolį ar seserį arba sutuoktinį (-ę). Naudokite „▾“, kad paslėptumėte tik to asmens vaikus.',
    'tree.modeBloodline': 'Sutuoktiniai nerodomi',
    'tree.modeSpouses': 'Rodomi sutuoktiniai',
    'tree.addRoot': 'Pridėti dar vieną šaknį',
    'tree.zoom': 'Medžio mastelis',
    'tree.zoomReset': 'Atstatyti',
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
    'notice.treeCreated': 'Medis sukurtas.',
    'notice.treeRenamed': 'Medžio pavadinimas pakeistas.',
    'notice.homePersonSet': 'Pagrindinis asmuo atnaujintas.',
    'notice.treeDeleted': 'Medis ištrintas.',
    'notice.gedcomExported': 'GEDCOM failas eksportuotas.',

    'confirm.delete':
      'Pašalinti {{name}}? Visi šio asmens vaikai taip pat bus pašalinti.',
    'confirm.demo':
      'Įkėlus pavyzdinę šeimą, dabartiniai šio medžio žmonės bus pakeisti. Tęsti?',
    'confirm.deleteTree':
      'Ištrinti medį „{{name}}“ ir visus {{count}} jame esančius žmones? To atšaukti negalima.',

    'person.born': 'Gimė {{date}}',
    'person.died': 'Mirė {{date}}',
    'person.deceased': 'Miręs (-usi)',
    'person.deceasedMale': 'Miręs',
    'person.deceasedFemale': 'Mirusi',
    'person.hideChildren': 'Slėpti vaikus',
    'person.showChildren': 'Rodyti vaikus',
    'person.noChildren': 'Šis asmuo neturi vaikų',
    'person.hideChildrenAria': 'Slėpti {{name}} vaikus',
    'person.showChildrenAria': 'Rodyti {{name}} vaikus',
    'person.homeBadge': 'Pagrindinis',
    'person.homePerson': 'Pagrindinis asmuo',
    'person.datesUnknown': 'Datos nenurodytos',
    'person.spouseLabel': 'Sutuoktinis (-ė) arba partneris (-ė): {{name}}',
    'person.addChild': 'Pridėti {{name}} vaiką',
    'person.addChildTitle': 'Pridėti vaiką',
    'person.addParent': 'Pridėti {{name}} tėvą ar motiną',
    'person.addParentTitle': 'Pridėti tėvą',
    'person.addSibling': 'Pridėti {{name}} brolį ar seserį',
    'person.addSiblingTitle': 'Pridėti brolį/seserį',
    'person.addRelative': 'Pridėti {{name}} giminaitį',
    'person.addRelativeTitle': 'Pridėti šeimos narį',
    'person.addSpouse': 'Pridėti {{name}} sutuoktinį (-ę)',
    'person.addSpouseTitle': 'Pridėti sutuoktinį (-ę)',
    'person.edit': 'Redaguoti {{name}}',
    'person.editTitle': 'Redaguoti asmenį',
    'person.delete': 'Pašalinti {{name}}',
    'person.deleteTitle': 'Pašalinti asmenį',
    'person.viewDetails': 'Peržiūrėti duomenis',

    'details.eyebrow': 'Asmens duomenys',
    'details.title': 'Apie {{name}}',
    'details.gender': 'Lytis',
    'details.status': 'Būsena',
    'details.birth': 'Gimė',
    'details.previousName': 'Mergautinė / ankstesnė pavardė',
    'details.death': 'Mirties data arba metai',
    'details.currentSpouse': 'Dabartinis sutuoktinis (-ė) arba partneris (-ė)',
    'details.previousSpouses': 'Buvę sutuoktiniai (-ės) arba partneriai (-ės)',
    'details.spouse': 'Sutuoktinis (-ė) arba partneris (-ė)',
    'details.parent': 'Tėvai medyje',
    'details.children': 'Vaikai medyje',
    'details.notes': 'Užrašai ir prisiminimai',
    'details.noNotes': 'Užrašų dar nėra.',
    'details.close': 'Uždaryti',
    'details.relationTo': '{{relation}} ({{name}})',
    'relation.homePerson': 'Pagrindinis asmuo',
    'relation.branchPerson': 'Šakos asmuo',
    'relation.self': 'Šis asmuo',
    'relation.father': 'Tėvas',
    'relation.mother': 'Motina',
    'relation.parent': 'Tėvas arba motina',
    'relation.son': 'Sūnus',
    'relation.daughter': 'Duktė',
    'relation.child': 'Vaikas',
    'relation.brother': 'Brolis',
    'relation.sister': 'Sesuo',
    'relation.sibling': 'Brolis arba sesuo',
    'relation.halfBrother': 'Įbrolis',
    'relation.halfSister': 'Įseserė',
    'relation.halfSibling': 'Įbrolis arba įseserė',
    'relation.grandfather': 'Senelis',
    'relation.grandmother': 'Senelė',
    'relation.grandparent': 'Senelis arba senelė',
    'relation.grandson': 'Anūkas',
    'relation.granddaughter': 'Anūkė',
    'relation.grandchild': 'Anūkas arba anūkė',
    'relation.greatGrandfather': 'Prosenelis',
    'relation.greatGrandmother': 'Prosenelė',
    'relation.greatGrandparent': 'Prosenelis arba prosenelė',
    'relation.greatGrandson': 'Proanūkis',
    'relation.greatGranddaughter': 'Proanūkė',
    'relation.greatGrandchild': 'Proanūkis arba proanūkė',
    'relation.uncle': 'Dėdė',
    'relation.aunt': 'Teta',
    'relation.auntOrUncle': 'Dėdė arba teta',
    'relation.nephew': 'Sūnėnas',
    'relation.niece': 'Dukterėčia',
    'relation.nephewOrNiece': 'Sūnėnas arba dukterėčia',
    'relation.cousinMale': 'Pusbrolis',
    'relation.cousinFemale': 'Pusseserė',
    'relation.cousin': 'Pusbrolis arba pusseserė',
    'relation.cousinSon': 'Pusbrolio arba pusseserės sūnus',
    'relation.cousinDaughter': 'Pusbrolio arba pusseserės duktė',
    'relation.cousinChild': 'Pusbrolio arba pusseserės vaikas',
    'relation.cousinSonFemale': 'Pusseserės sūnus',
    'relation.cousinDaughterFemale': 'Pusseserės duktė',
    'relation.cousinChildFemale': 'Pusseserės vaikas',
    'relation.cousinSonMale': 'Pusbrolio sūnus',
    'relation.cousinDaughterMale': 'Pusbrolio duktė',
    'relation.cousinChildMale': 'Pusbrolio vaikas',
    'relation.greatNephew': 'Didysis sūnėnas',
    'relation.greatNiece': 'Didžioji dukterėčia',
    'relation.greatNephewOrNiece': 'Didysis sūnėnas arba didžioji dukterėčia',
    'relation.parentCousin': 'Tėvų pusbrolis arba pusseserė',
    'relation.husband': 'Vyras',
    'relation.wife': 'Žmona',
    'relation.partner': 'Partneris (-ė)',
    'relation.exHusband': 'Buvęs vyras',
    'relation.exWife': 'Buvusi žmona',
    'relation.exPartner': 'Buvęs partneris (-ė)',
    'relation.spouseOf': '{{relation}} {{spouse}}',
    'relation.fatherInLaw': 'Sutuoktinio (-ės) tėvas',
    'relation.motherInLaw': 'Sutuoktinio (-ės) motina',
    'relation.parentInLaw': 'Sutuoktinio (-ės) tėvas arba motina',
    'relation.brotherInLaw': 'Svainis',
    'relation.sisterInLaw': 'Svainė',
    'relation.siblingInLaw': 'Svainis arba svainė',
    'relation.stepFather': 'Patėvis',
    'relation.stepMother': 'Pamotė',
    'relation.stepParent': 'Patėvis arba pamotė',
    'relation.stepSon': 'Posūnis',
    'relation.stepDaughter': 'Podukra',
    'relation.stepChild': 'Posūnis arba podukra',
    'relation.stepBrother': 'Patėvio arba pamotės brolis',
    'relation.stepSister': 'Patėvio arba pamotės sesuo',
    'relation.stepSibling': 'Patėvio arba pamotės vaikas',
    'relation.relative': 'Giminaitis (-ė)',
    'relation.relativeByMarriage': 'Giminaitis (-ė) per santuoką',
    'relation.ancestor': 'Protėvis',
    'relation.descendant': 'Palikuonis',
    'relation.fatherGenitive': 'Tėvo',
    'relation.motherGenitive': 'Motinos',
    'relation.parentGenitive': 'Tėvo arba motinos',
    'relation.sonGenitive': 'Sūnaus',
    'relation.daughterGenitive': 'Dukters',
    'relation.childGenitive': 'Vaiko',
    'relation.brotherGenitive': 'Brolio',
    'relation.sisterGenitive': 'Sesers',
    'relation.siblingGenitive': 'Brolio arba sesers',
    'relation.halfBrotherGenitive': 'Įbrolio',
    'relation.halfSisterGenitive': 'Įseserės',
    'relation.halfSiblingGenitive': 'Įbrolio arba įseserės',
    'relation.grandfatherGenitive': 'Senelio',
    'relation.grandmotherGenitive': 'Senelės',
    'relation.grandparentGenitive': 'Senelio arba senelės',
    'relation.grandsonGenitive': 'Anūko',
    'relation.granddaughterGenitive': 'Anūkės',
    'relation.grandchildGenitive': 'Anūko arba anūkės',
    'relation.greatGrandfatherGenitive': 'Prosenelio',
    'relation.greatGrandmotherGenitive': 'Prosenelės',
    'relation.greatGrandparentGenitive': 'Prosenelio arba prosenelės',
    'relation.greatGrandsonGenitive': 'Proanūkio',
    'relation.greatGranddaughterGenitive': 'Proanūkės',
    'relation.greatGrandchildGenitive': 'Proanūkio arba proanūkės',
    'relation.uncleGenitive': 'Dėdės',
    'relation.auntGenitive': 'Tetos',
    'relation.auntOrUncleGenitive': 'Dėdės arba tetos',
    'relation.nephewGenitive': 'Sūnėno',
    'relation.nieceGenitive': 'Dukterėčios',
    'relation.nephewOrNieceGenitive': 'Sūnėno arba dukterėčios',
    'relation.cousinMaleGenitive': 'Pusbrolio',
    'relation.cousinFemaleGenitive': 'Pusseserės',
    'relation.cousinGenitive': 'Pusbrolio arba pusseserės',
    'relation.cousinSonGenitive': 'Pusbrolio arba pusseserės sūnaus',
    'relation.cousinDaughterGenitive': 'Pusbrolio arba pusseserės dukters',
    'relation.cousinChildGenitive': 'Pusbrolio arba pusseserės vaiko',
    'relation.cousinSonFemaleGenitive': 'Pusseserės sūnaus',
    'relation.cousinDaughterFemaleGenitive': 'Pusseserės dukters',
    'relation.cousinChildFemaleGenitive': 'Pusseserės vaiko',
    'relation.cousinSonMaleGenitive': 'Pusbrolio sūnaus',
    'relation.cousinDaughterMaleGenitive': 'Pusbrolio dukters',
    'relation.cousinChildMaleGenitive': 'Pusbrolio vaiko',
    'relation.greatNephewGenitive': 'Didžiojo sūnėno',
    'relation.greatNieceGenitive': 'Didžiosios dukterėčios',
    'relation.greatNephewOrNieceGenitive':
      'Didžiojo sūnėno arba didžiosios dukterėčios',
    'relation.parentCousinGenitive': 'Tėvų pusbrolio arba pusseserės',
    'relation.husbandGenitive': 'Vyro',
    'relation.wifeGenitive': 'Žmonos',
    'relation.partnerGenitive': 'Partnerio (-ės)',
    'relation.exHusbandGenitive': 'Buvusio vyro',
    'relation.exWifeGenitive': 'Buvusios žmonos',
    'relation.exPartnerGenitive': 'Buvusio partnerio (-ės)',
    'relation.fatherInLawGenitive': 'Sutuoktinio (-ės) tėvo',
    'relation.motherInLawGenitive': 'Sutuoktinio (-ės) motinos',
    'relation.parentInLawGenitive': 'Sutuoktinio (-ės) tėvo arba motinos',
    'relation.brotherInLawGenitive': 'Svainio',
    'relation.sisterInLawGenitive': 'Svainės',
    'relation.siblingInLawGenitive': 'Svainio arba svainės',
    'relation.stepFatherGenitive': 'Patėvio',
    'relation.stepMotherGenitive': 'Pamotės',
    'relation.stepParentGenitive': 'Patėvio arba pamotės',
    'relation.stepSonGenitive': 'Posūnio',
    'relation.stepDaughterGenitive': 'Podukros',
    'relation.stepChildGenitive': 'Posūnio arba podukros',
    'relation.stepBrotherGenitive': 'Patėvio arba pamotės brolio',
    'relation.stepSisterGenitive': 'Patėvio arba pamotės sesers',
    'relation.stepSiblingGenitive': 'Patėvio arba pamotės vaiko',
    'relation.relativeGenitive': 'Giminaičio (-ės)',
    'relation.relativeByMarriageGenitive': 'Giminaičio (-ės) per santuoką',
    'relation.ancestorGenitive': 'Protėvio',
    'relation.descendantGenitive': 'Palikuonio',
    'modal.updateDetails': 'Atnaujinti duomenis',
    'modal.newRelative': 'Naujas giminaitis',
    'modal.editTitle': 'Redaguoti {{name}}',
    'modal.addChild': 'Pridėti vaiką',
    'modal.addParentTitle': 'Pridėti tėvą ar motiną',
    'modal.addSiblingTitle': 'Pridėti brolį ar sesę',
    'modal.addPerson': 'Pridėti asmenį',
    'modal.addSpouseTitle': 'Pridėti sutuoktinį (-ę)',
    'modal.firstName': 'Vardas *',
    'modal.firstNamePlaceholder': 'Marija',
    'modal.lastName': 'Pavardė',
    'modal.lastNamePlaceholder': 'Petrauskas',
    'modal.gender': 'Lytis',
    'modal.genderUnknown': 'Nepasakyta',
    'modal.genderFemale': 'Moteris',
    'modal.genderMale': 'Vyras',
    'modal.genderOther': 'Kita',
    'modal.father': 'Tėvas medyje',
    'modal.mother': 'Motina medyje',
    'modal.noFather': 'Tėvas nenurodytas',
    'modal.noMother': 'Motina nenurodyta',
    'modal.previousName': 'Mergautinė / ankstesnė pavardė',
    'modal.previousNamePlaceholder': 'pvz., Strumskytė',
    'modal.previousNameHint':
      'Pavardė, kuriuo šis asmuo vadinosi anksčiau, pavyzdžiui, mergautinė pavardė.',
    'modal.birth': 'Gimimo data arba metai',
    'modal.birthPlaceholder': 'pvz., 1945 arba 1991 m. sausio 16 d.',
    'modal.birthPlace': 'Gimimo vieta',
    'modal.birthPlacePlaceholder': 'pvz., Kaunas, Lietuva',
    'modal.death': 'Mirties data arba metai',
    'modal.deathPlaceholder': 'Palikite tuščią, jei asmuo gyvas',
    'modal.dateHint':
      'Įrašykite metus (1945), mėnesį ir metus (1945 m. birželis) arba pilną datą (1991 m. sausio 16 d.), arba pasirinkite kalendoriuje.',
    'modal.deceased': 'Miręs (-usi)',
    'modal.deceasedHint':
      'Pažymėkite, jei asmuo miręs, net kai data nežinoma.',
    'modal.linkedSpouse': 'Sutuoktinis (-ė) medyje',
    'modal.noLinkedSpouse': 'Nėra susieto sutuoktinio (-ės)',
    'modal.linkedSpouseHint':
      'Susiekite esamą asmenį, kad jis būtų rodomas atskira sujungta kortele.',
    'modal.currentSpouse': 'Dabartinis sutuoktinis (-ė) arba partneris (-ė)',
    'modal.noCurrentSpouse': 'Nėra susietų sutuoktinių ar partnerių',
    'modal.partner': 'Sutuoktinis (-ė) arba partneris (-ė)',
    'modal.addPreviousSpouse':
      'Pridėti sutuoktinį (-ę) arba partnerį (-ę)',
    'modal.previousSpouseBlock':
      'Buvęs sutuoktinis (-ė) arba partneris (-ė)',
    'modal.noPreviousSpouse': 'Pasirinkite buvusį partnerį',
    'modal.removeRelationship': 'Pašalinti',
    'modal.relationshipDatePlaceholder':
      'pvz., 1991 arba 1991 m. sausio 16 d.',
    'modal.relationshipPlacePlaceholder': 'pvz., Kaunas, Lietuva',
    'modal.marriageDate': 'Santuokos data',
    'modal.marriagePlace': 'Santuokos vieta',
    'modal.engagementDate': 'Sužadėtuvių data',
    'modal.engagementPlace': 'Sužadėtuvių vieta',
    'modal.meetingDate': 'Susipažinimo data',
    'modal.meetingPlace': 'Susipažinimo vieta',
    'modal.divorceDate': 'Skyrybų data',
    'modal.separationDate': 'Atskyrimo data',
    'modal.currentSpouseHint':
      'Pasirinkite asmenį, su kuriuo šis asmuo šiuo metu susituokęs (-usi) arba partnerystėje.',
    'modal.previousSpouses': 'Buvę sutuoktiniai (-ės) arba partneriai (-ės)',
    'modal.previousSpousesHint':
      'Laikykite Ctrl arba Cmd, kad pasirinktumėte kelis. Buvę partneriai rodomi su nulaužta širdimi ir brūkšnine linija.',
    'modal.previousSpousesEmpty':
      'Medyje dar nėra kitų žmonių, kuriuos būtų galima pažymėti kaip buvusius partnerius.',
    'modal.spouseStatus': 'Ryšio būsena',
    'relationship.married': 'Susituokę',
    'relationship.partner': 'Partneriai',
    'relationship.engaged': 'Suzadėję',
    'relationship.divorced': 'Išsiskyrę',
    'relationship.widowed': 'Našlys',
    'relationship.widowedFemale': 'Našlė',
    'relationship.separated': 'Atsiskyrę',
    'modal.spouseStatusCurrent': 'Dabartinis sutuoktinis (-ė) arba partneris (-ė)',
    'modal.spouseStatusFormer': 'Buvęs sutuoktinis (-ė) arba partneris (-ė)',
    'modal.spouse': 'Sutuoktinio (-ės) arba partnerio (-ės) vardas (neprivaloma)',
    'modal.spousePlaceholder': 'Vardas rodomas prie šio asmens',
    'modal.spouseHint':
      'Naudojama tik kai medyje nesusietas sutuoktinis (-ė); kitu atveju vardą pateikia susietas sutuoktinis (-ė).',
    'modal.notes': 'Užrašai ir prisiminimai',
    'modal.notesPlaceholder':
      'Istorija, profesija, vieta ar bet kas, ką verta prisiminti…',
    'modal.save': 'Išsaugoti pakeitimus',
    'modal.saving': 'Išsaugoma…',
    'modal.addToTree': 'Pridėti į medį',

    'trees.active': 'Aktyvus medis',
    'trees.manage': 'Tvarkyti medžius',
    'trees.manageEyebrow': 'Jūsų archyvas',
    'trees.manageTitle': 'Šeimos medžiai',
    'trees.manageCopy':
      'Atskiras šeimos linijas laikykite atskiruose medžiuose. Importuoti duomenys ir nauji žmonės patenka į čia atidarytą medį.',
    'trees.currentBadge': 'Atidarytas',
    'trees.open': 'Atidaryti',
    'trees.rename': 'Pervadinti',
    'trees.delete': 'Ištrinti',
    'trees.createTitle': 'Sukurti naują medį',
    'trees.createCopy':
      'Pradėkite tuščią, tada pridėkite žmonių arba importuokite GEDCOM failą.',
    'trees.name': 'Medžio pavadinimas',
    'trees.namePlaceholder': 'pvz., Petrauskų šeima',
    'trees.create': 'Sukurti medį',
    'trees.creating': 'Sukuriama…',
    'trees.save': 'Išsaugoti pavadinimą',
    'trees.saving': 'Išsaugoma…',
    'trees.cancelRename': 'Atšaukti',
    'trees.renameLabel': 'Naujas „{{name}}“ pavadinimas',
    'trees.lastTreeHint':
      'Reikia bent vieno medžio. Pervadinkite šį medį, o ne ištrinkite.',
    'trees.people.one': '{{count}} asmuo',
    'trees.people.few': '{{count}} asmenys',
    'trees.people.many': '{{count}} asmenų',
    'trees.people.other': '{{count}} asmenų',

    'gedcom.import': 'Importuoti GEDCOM',
    'gedcom.export': 'Eksportuoti GEDCOM',
    'gedcom.importTitle': 'Importuoti GEDCOM failą',
    'gedcom.eyebrow': 'Šeimos duomenys',
    'gedcom.chooseFile': 'Pasirinkite .ged failą',
    'gedcom.fileHint':
      'GEDCOM 5.5.1 failai iš „Ancestry“, „MyHeritage“, „Gramps“ ar kitos šeimos medžio programos.',
    'gedcom.selectedFile': 'Pasirinktas failas: {{name}}',
    'gedcom.mergeHint':
      'Šis importas bus sujungtas su medžiu „{{tree}}“. Esami žmonės sutapatinami pagal vardą ir gimimo metus, o trūkstami duomenys papildomi.',
    'gedcom.changeFile': 'Pasirinkti kitą failą',
    'gedcom.reading': 'Skaitomas failas…',
    'gedcom.previewTitle': 'Paruošta importuoti',
    'gedcom.previewCopy':
      'Peržiūrėkite, kas rasta, prieš pridėdami į šį medį.',
    'gedcom.individuals': 'Asmenys',
    'gedcom.families': 'Šeimos',
    'gedcom.notes': 'Su užrašais',
    'gedcom.dated': 'Su datomis',
    'gedcom.warnings': 'Įspėjimai',
    'gedcom.noWarnings': 'Įspėjimų nėra – failas atrodo tvarkingas.',
    'gedcom.warningCount.one': '{{count}} įspėjimas',
    'gedcom.warningCount.few': '{{count}} įspėjimai',
    'gedcom.warningCount.many': '{{count}} įspėjimų',
    'gedcom.warningCount.other': '{{count}} įspėjimų',
    'gedcom.moreWarnings': '…ir dar {{count}}.',
    'gedcom.importing': 'Importuojama…',
    'gedcom.doImport': 'Importuoti į šį medį',
    'gedcom.resultTitle': 'Importas baigtas',
    'gedcom.resultCopy':
      'Medyje „{{tree}}“ dabar yra importuoti šeimos duomenys.',
    'gedcom.created': 'Pridėta žmonių',
    'gedcom.updated': 'Sujungta žmonių',
    'gedcom.spouseLinks': 'Pridėta sutuoktinių sąsajų',
    'gedcom.parentLinks': 'Pridėta tėvų sąsajų',
    'gedcom.done': 'Atlikta',
    'gedcom.importAnother': 'Importuoti kitą failą',
    'gedcom.parseError': 'Šio failo nepavyko perskaityti kaip GEDCOM 5.5.1.',
    'gedcom.noPeople': 'Šiame GEDCOM faile nerasta žmonių.',
    'gedcom.tooMany':
      'Šiame faile yra {{count}} žmonių. Vienu metu galima importuoti iki {{max}} žmonių.',
    'gedcom.fileTooLarge': 'Pasirinkite failą, mažesnį nei 20 MB.',
    'gedcom.warn.missingName': 'Asmuo be vardo buvo praleistas.',
    'gedcom.warn.duplicateReference':
      'Dviguba nuoroda ({{ref}}) buvo praleista.',
    'gedcom.warn.unknownReference':
      'Šeimos nuoroda ({{ref}}) nerasta ir buvo praleista.',
    'gedcom.warn.ambiguousMatch':
      'Su {{name}} sutampa keli esami žmonės, todėl buvo pridėtas naujas asmuo.',
    'gedcom.warn.spouseConflict':
      'Sutuoktinių sąsaja tarp {{person}} ir {{spouse}} praleista, nes vienas iš jų jau turi kitą sutuoktinį.',
    'gedcom.warn.parentConflict':
      '{{person}} jau turi kitą tėvą ar motiną, todėl {{parent}} nebuvo susietas (-a).',
    'gedcom.warn.fieldConflict':
      'Išsaugoti jūsų esami {{person}} duomenys, kurie skiriasi nuo importuoto failo.',
    'gedcom.warn.cycle':
      '{{person}} tėvų sąsaja praleista, nes ji sukurtų ciklą.',
    'gedcom.warn.multipleParentFamilies':
      '{{count}} žmonių patenka į daugiau nei vieną šeimą kaip vaikai; išsaugoma tik pirmoji tėvų sąsaja.',
    'gedcom.warn.multipleSpouseFamilies':
      '{{count}} žmonių patenka į daugiau nei vieną šeimą kaip sutuoktiniai; išsaugoma tik viena sutuoktinio sąsaja.',
    'gedcom.warn.twoParentFamily':
      '{{count}} šeimų turi du tėvus. Ši programa išsaugo vieną tėvą vienam asmeniui, todėl vaikai susiejami su pirmuoju tėvu.',
    'gedcom.warn.unsupportedVersion':
      'Failas nurodo GEDCOM {{version}}; pilnai palaikomas tik GEDCOM 5.5.1.',
    'gedcom.warn.unsupportedEncoding':
      'Failas naudoja {{encoding}} koduotę. Eksportuokite jį kaip UTF-8, kad vardai būtų patikimi.',
    'gedcom.warn.malformedLines':
      '{{count}} netaisyklingų eilučių buvo praleista.',
    'gedcom.warn.tooManyIndividuals':
      'Vienu metu galima importuoti tik pirmuosius {{count}} žmones.',

    'errors.generic': 'Kažkas nepavyko. Bandykite dar kartą.',
    'errors.loadTree': 'Nepavyko įkelti šeimos medžio. Bandykite dar kartą.',
    'errors.savePerson':
      'Nepavyko išsaugoti šio asmens. Bandykite dar kartą.',
    'errors.deletePerson': 'Nepavyko pašalinti šio asmens.',
    'errors.loadDemo': 'Nepavyko įkelti pavyzdinės šeimos.',
    'errors.saveProfile':
      'Nepavyko išsaugoti profilio. Bandykite dar kartą.',
    'errors.saveSettings':
      'Nepavyko išsaugoti nuostatų. Bandykite dar kartą.',
    'errors.loadTrees':
      'Nepavyko įkelti šeimos medžių. Bandykite dar kartą.',
    'errors.createTree':
      'Nepavyko sukurti šio medžio. Bandykite dar kartą.',
    'errors.renameTree':
      'Nepavyko pervadinti šio medžio. Bandykite dar kartą.',
    'errors.deleteTree':
      'Nepavyko ištrinti šio medžio. Bandykite dar kartą.',
    'errors.homePerson':
      'Nepavyko pakeisti pagrindinio asmens. Bandykite dar kartą.',
    'errors.importGedcom':
      'Nepavyko importuoti šio GEDCOM failo. Bandykite dar kartą.',

    'settings.openSettings': 'Atidaryti profilį ir nustatymus',
    'settings.eyebrow': 'Jūsų paskyra',
    'settings.title': 'Profilis ir nustatymai',
    'settings.profileTitle': 'Profilis',
    'settings.profileCopy':
      'Atnaujinkite prisijungimui naudojamą vardą ir el. paštą.',
    'settings.name': 'Vardas',
    'settings.email': 'El. pašto adresas',
    'settings.saveProfile': 'Išsaugoti profilį',
    'settings.savingProfile': 'Išsaugoma…',
    'settings.profileSaved': 'Profilis atnaujintas.',
    'settings.preferencesTitle': 'Medžio nuostatos',
    'settings.bloodlineOnly': 'Tik kraujo linijos medis',
    'settings.bloodlineOnlyHint':
      'Kai išjungta (numatytoji būsena), sutuoktiniai rodomi kaip atskiros sujungtos kortelės su savo tėvais ir vaikais.',
    'settings.modeBloodlineNote':
      'Įjungtas kraujo linijos vaizdas. Sutuoktiniai rodomi kaip vardai toje pačioje kortelėje.',
    'settings.modeSpouseNote':
      'Įjungtos sutuoktinių kortelės. Kiekvienas sutuoktinis turi savo kortelę ir ryšius.',
    'settings.savingPreferences': 'Išsaugomos nuostatos…',
    'settings.bloodlineEnabledNotice': 'Įjungtas tik kraujo linijos medis.',
    'settings.spouseModeEnabledNotice':
      'Įjungtos atskiros sutuoktinių kortelės.',
    'settings.showFormerSpouses': 'Rodyti ištisusius santykius',
    'settings.showFormerSpousesHint':
      'Kai išjungta, ištisusi santykiuose yra pasmerkti ir vaikai lieka susieti su dabartiniu tėvu.',
    'settings.showFormerSpousesNotice': 'Ištisusi santykiuose rodomi.',
    'settings.hideFormerSpousesNotice': 'Ištisusi santykiuose nerydomi.',
    'settings.accountTitle': 'Paskyra',
    'settings.memberSince': 'Narys nuo',
    'settings.privacy': 'Privatumas',
    'settings.privateTree': 'Jūsų medis matomas tik šiai paskyrai.',
    'settings.unknownDate': 'Nežinoma',

    'branch.hideChildren': 'Slėpti vaikus',
    'branch.showChild': 'Rodyti 1 vaiką',
    'branch.showChildren': 'Rodyti vaikus ({{count}})',
    'branch.focus': 'Rodyti tik šią šaką',
    'branch.focusHasFamily': 'Atidaryti šią šeimos šaką',
    'branch.focusAria': 'Rodyti tik {{name}} šaką',
    'branch.focusBanner': 'Rodoma {{name}} šaka',
    'branch.focusHint':
      'Čia rodoma visa jų kraujo linija — protėviai, dėdės, tetos, pusbroliai ir pusseserės bei palikuonys — su sutuoktiniais.',
    'branch.fullTreeNote':
      'Sutuoktinio tėvai ir šeima rodomi jo šakoje — atidarykite ją mygtuku „◎“.',
    'branch.backToFull': 'Grįžti prie viso medžio',

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
    'api.invalidSpouse': 'Netinkamas sutuoktinis (-ė).',
    'api.spouseNotFound': 'Sutuoktinis (-ė) nerastas (-a).',
    'api.ownSpouse': 'Asmuo negali būti savo paties sutuoktiniu (-e).',
    'api.firstNameRequired': 'Būtina įvesti vardą.',
    'api.personNotFound': 'Asmuo nerastas.',
    'api.treeNotFound': 'Šeimos medis nerastas.',
    'api.treeNameRequired': 'Būtina įvesti medžio pavadinimą.',
    'api.treeNameExists': 'Medis šiuo pavadinimu jau egzistuoja.',
    'api.lastTree': 'Reikia bent vieno medžio.',
    'api.gedcomEmpty': 'Nėra GEDCOM duomenų importuoti.',
    'api.gedcomTooMany': 'Šiame GEDCOM faile per daug žmonių.',
    'api.gedcomInvalid': 'Netaisyklingi GEDCOM duomenys.',
    'api.gedcomTooLarge': 'Importo failas per didelis.',
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
  'Invalid spouse': 'api.invalidSpouse',
  'Spouse not found': 'api.spouseNotFound',
  'A person cannot be their own spouse': 'api.ownSpouse',
  'First name is required': 'api.firstNameRequired',
  'Person not found': 'api.personNotFound',
  'Tree not found': 'api.treeNotFound',
  'Tree name is required': 'api.treeNameRequired',
  'A tree with this name already exists': 'api.treeNameExists',
  'You need at least one tree': 'api.lastTree',
  'No GEDCOM data to import': 'api.gedcomEmpty',
  'This GEDCOM file contains too many people': 'api.gedcomTooMany',
  'Invalid GEDCOM data': 'api.gedcomInvalid',
  'Import file is too large': 'api.gedcomTooLarge',
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

export function personDeceasedLabel(t, person) {
  if (person?.gender === 'male') return t('person.deceasedMale');
  if (person?.gender === 'female') return t('person.deceasedFemale');
  return t('person.deceased');
}
