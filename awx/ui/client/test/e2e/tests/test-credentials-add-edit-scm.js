import uuid from 'uuid';


let testID = uuid().substr(0,8);

let store = {
    organization: {
        name: `org-${testID}`
    },
    credential: {
        name: `cred-${testID}`
    },
};

module.exports = {
    before: function(client, done) {
        const credentials = client.page.credentials();
        const details = credentials.section.add.section.details;

        client.login();
        client.waitForAngular();

        client.inject([store, 'OrganizationModel'], (store, model) => {
            return new model().http.post(store.organization);
        },
        ({ data }) => {
            store.organization = data;
        });

        credentials.section.navigation
            .waitForElementVisible('@credentials')
            .click('@credentials');

        credentials
            .waitForElementVisible('div.spinny')
            .waitForElementNotVisible('div.spinny');

        credentials.section.list
            .waitForElementVisible('@add')
            .click('@add');

        details.waitForElementVisible('@save', done);
    },
    'common fields are visible and enabled': function(client) {
        const credentials = client.page.credentials();
        const details = credentials.section.add.section.details;

        details.expect.element('@name').visible;
        details.expect.element('@description').visible;
        details.expect.element('@organization').visible;
        details.expect.element('@type').visible;

        details.expect.element('@name').enabled;
        details.expect.element('@description').enabled;
        details.expect.element('@organization').enabled;
        details.expect.element('@type').enabled;
    },
    'required common fields display \'*\'': function(client) {
        const credentials = client.page.credentials();
        const details = credentials.section.add.section.details;

        details.section.name.expect.element('@label').text.to.contain('*');
        details.section.type.expect.element('@label').text.to.contain('*');
    },
    'save button becomes enabled after providing required fields': function(client) {
        const credentials = client.page.credentials();
        const details = credentials.section.add.section.details;

        details.expect.element('@save').not.enabled;

        details
            .setValue('@name', store.credential.name)
            .setValue('@organization', store.organization.name)
            .setValue('@type', 'Source Control');

        details.expect.element('@save').enabled;
    },
    'scm credential fields are visible after choosing type': function(client) {
        const credentials = client.page.credentials();
        const details = credentials.section.add.section.details;

        details.section.scm.expect.element('@username').visible;
        details.section.scm.expect.element('@password').visible;
        details.section.scm.expect.element('@sshKeyData').visible;
        details.section.scm.expect.element('@sshKeyUnlock').visible;
    },
    'error displayed for invalid ssh key data': function(client) {
        const credentials = client.page.credentials();
        const details = credentials.section.add.section.details;
        const sshKeyData = details.section.scm.section.sshKeyData;

        details
            .clearAndSelectType('Source Control')
            .setValue('@name', store.credential.name);

        details.section.scm.setValue('@sshKeyData', 'invalid');

        details.click('@save');

        sshKeyData.expect.element('@error').visible;
        sshKeyData.expect.element('@error').text.to.contain('Invalid certificate or key');

        details.section.scm.clearValue('@sshKeyData');
        sshKeyData.expect.element('@error').not.present;
    },
    'error displayed for unencrypted ssh key with passphrase': function(client) {
        const credentials = client.page.credentials();
        const details = credentials.section.add.section.details;
        const sshKeyUnlock = details.section.scm.section.sshKeyUnlock;

        details
            .clearAndSelectType('Source Control')
            .setValue('@name', store.credential.name);

        details.section.scm
            .setValue('@sshKeyUnlock', 'password')
            .sendKeys('@sshKeyData', '-----BEGIN RSA PRIVATE KEY-----')
            .sendKeys('@sshKeyData', client.Keys.ENTER)
            .sendKeys('@sshKeyData', 'AAAA')
            .sendKeys('@sshKeyData', client.Keys.ENTER)
            .sendKeys('@sshKeyData', '-----END RSA PRIVATE KEY-----');

        details.click('@save');

        sshKeyUnlock.expect.element('@error').visible;
        sshKeyUnlock.expect.element('@error').text.to.contain('not encrypted');

        details.section.scm.clearValue('@sshKeyUnlock');
        sshKeyUnlock.expect.element('@error').not.present;
   },
   'create SCM credential': function(client) {
        const credentials = client.page.credentials();
        const add = credentials.section.add;
        const edit = credentials.section.edit;

        add.section.details
            .clearAndSelectType('Source Control')
            .setValue('@name', store.credential.name)
            .setValue('@organization', store.organization.name);

        add.section.details.section.scm
            .setValue('@username', 'gthorpe')
            .setValue('@password', 'hydro')
            .sendKeys('@sshKeyData', '-----BEGIN RSA PRIVATE KEY-----')
            .sendKeys('@sshKeyData', client.Keys.ENTER)
            .sendKeys('@sshKeyData', 'AAAA')
            .sendKeys('@sshKeyData', client.Keys.ENTER)
            .sendKeys('@sshKeyData', '-----END RSA PRIVATE KEY-----');

        add.section.details.click('@save');

        credentials
            .waitForElementVisible('div.spinny')
            .waitForElementNotVisible('div.spinny');

        edit.expect.element('@title').text.equal(store.credential.name);
    },
    'edit details panel remains open after saving': function(client) {
        const credentials = client.page.credentials();

        credentials.section.edit.expect.section('@details').visible;
    },
    'credential is searchable after saving': function(client) {
        const credentials = client.page.credentials();
        const row = '#credentials_table tbody tr';

        credentials.section.list.section.search
            .waitForElementVisible('@input', client.globals.longWait)
            .setValue('@input', `name:${store.credential.name}`)
            .click('@searchButton');

        credentials.waitForElementNotPresent(`${row}:nth-of-type(2)`);
        credentials.expect.element(row).text.to.contain(store.credential.name);

        client.end();
    }
};
