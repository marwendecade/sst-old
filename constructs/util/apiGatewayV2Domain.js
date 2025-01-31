import { Token } from "aws-cdk-lib/core";
import { DomainName } from "aws-cdk-lib/aws-apigatewayv2";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53Targets from "aws-cdk-lib/aws-route53-targets";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
export function buildCustomDomainData(scope, customDomain) {
    if (customDomain === undefined) {
        return;
    }
    // customDomain is a string
    else if (typeof customDomain === "string") {
        return buildDataForStringInput(scope, customDomain);
    }
    // customDomain.domainName is a string
    else if (customDomain.domainName) {
        return customDomain.isExternalDomain
            ? buildDataForExternalDomainInput(scope, customDomain)
            : buildDataForInternalDomainInput(scope, customDomain);
    }
    // customDomain.domainName is a construct
    else if (customDomain.cdk?.domainName) {
        return buildDataForConstructInput(scope, customDomain);
    }
    // customDomain.domainName not exists
    throw new Error(`Missing "domainName" in sst.Api's customDomain setting`);
}
function buildDataForStringInput(scope, customDomain) {
    // validate: customDomain is a TOKEN string
    // ie. imported SSM value: ssm.StringParameter.valueForStringParameter()
    if (Token.isUnresolved(customDomain)) {
        throw new Error(`You also need to specify the "hostedZone" if the "domainName" is passed in as a reference.`);
    }
    assertDomainNameIsLowerCase(customDomain);
    const domainName = customDomain;
    const hostedZoneDomain = parseRoute53Domain(domainName);
    const hostedZone = lookupHostedZone(scope, hostedZoneDomain);
    const certificate = createCertificate(scope, domainName, hostedZone);
    const apigDomain = createApigDomain(scope, domainName, certificate);
    createARecords(scope, hostedZone, domainName, apigDomain);
    return {
        apigDomain,
        certificate,
        isApigDomainCreated: true,
        isCertificatedCreated: true,
        url: buildDomainUrl(domainName),
    };
}
function buildDataForInternalDomainInput(scope, customDomain) {
    // If customDomain is a TOKEN string, "hostedZone" has to be passed in. This
    // is because "hostedZone" cannot be parsed from a TOKEN value.
    if (Token.isUnresolved(customDomain.domainName)) {
        if (!customDomain.hostedZone && !customDomain.cdk?.hostedZone) {
            throw new Error(`You also need to specify the "hostedZone" if the "domainName" is passed in as a reference.`);
        }
    }
    // If domain is not a token, ensure it is lower case
    else {
        assertDomainNameIsLowerCase(customDomain.domainName);
    }
    const domainName = customDomain.domainName;
    // Lookup hosted zone
    // Note: Allow user passing in `hostedZone` object. The use case is when
    //       there are multiple HostedZones with the same domain, but one is
    //       public, and one is private.
    let hostedZone;
    if (customDomain.hostedZone) {
        const hostedZoneDomain = customDomain.hostedZone;
        hostedZone = lookupHostedZone(scope, hostedZoneDomain);
    }
    else if (customDomain.cdk?.hostedZone) {
        hostedZone = customDomain.cdk.hostedZone;
    }
    else {
        const hostedZoneDomain = parseRoute53Domain(domainName);
        hostedZone = lookupHostedZone(scope, hostedZoneDomain);
    }
    // Create certificate
    // Note: Allow user passing in `certificate` object. The use case is for
    //       user to create wildcard certificate or using an imported certificate.
    let certificate;
    let isCertificatedCreated;
    if (customDomain.cdk?.certificate) {
        certificate = customDomain.cdk.certificate;
        isCertificatedCreated = false;
    }
    else {
        certificate = createCertificate(scope, domainName, hostedZone);
        isCertificatedCreated = true;
    }
    const apigDomain = createApigDomain(scope, domainName, certificate);
    const mappingKey = customDomain.path;
    createARecords(scope, hostedZone, domainName, apigDomain);
    return {
        apigDomain,
        mappingKey,
        certificate,
        isApigDomainCreated: true,
        isCertificatedCreated,
        url: buildDomainUrl(domainName, mappingKey),
    };
}
function buildDataForExternalDomainInput(scope, customDomain) {
    // if it is external, then a certificate is required
    if (!customDomain.cdk?.certificate) {
        throw new Error(`A valid certificate is required when "isExternalDomain" is set to "true".`);
    }
    // if it is external, then the hostedZone is not required
    if (customDomain.hostedZone || customDomain.cdk?.hostedZone) {
        throw new Error(`Hosted zones can only be configured for domains hosted on Amazon Route 53. Do not set the "hostedZone" when "isExternalDomain" is enabled.`);
    }
    // If domain is not a token, ensure it is lower case
    if (!Token.isUnresolved(customDomain.domainName)) {
        assertDomainNameIsLowerCase(customDomain.domainName);
    }
    const domainName = customDomain.domainName;
    const certificate = customDomain.cdk.certificate;
    const apigDomain = createApigDomain(scope, domainName, certificate);
    const mappingKey = customDomain.path;
    return {
        apigDomain,
        mappingKey,
        certificate,
        isApigDomainCreated: true,
        isCertificatedCreated: false,
        url: buildDomainUrl(domainName, mappingKey),
    };
}
function buildDataForConstructInput(_scope, customDomain) {
    //  Allow user passing in `apigDomain` object. The use case is a user creates
    //  multiple API endpoints, and is mapping them under the same custom domain.
    //  `sst.Api` needs to expose the `apigDomain` construct created in the first
    //  Api, and lets user pass it in when creating the second Api.
    if (customDomain.hostedZone || customDomain.cdk?.hostedZone) {
        throw new Error(`Cannot configure the "hostedZone" when the "domainName" is a construct`);
    }
    if (customDomain.cdk?.certificate) {
        throw new Error(`Cannot configure the "certificate" when the "domainName" is a construct`);
    }
    const apigDomain = customDomain.cdk?.domainName;
    const domainName = apigDomain.name;
    const mappingKey = customDomain.path;
    return {
        apigDomain,
        mappingKey,
        certificate: undefined,
        isApigDomainCreated: false,
        isCertificatedCreated: false,
        url: buildDomainUrl(domainName, mappingKey),
    };
}
function lookupHostedZone(scope, hostedZoneDomain) {
    return route53.HostedZone.fromLookup(scope, "HostedZone", {
        domainName: hostedZoneDomain,
    });
}
function createCertificate(scope, domainName, hostedZone) {
    return new acm.Certificate(scope, "Certificate", {
        domainName,
        validation: acm.CertificateValidation.fromDns(hostedZone),
    });
}
function createApigDomain(scope, domainName, certificate) {
    return new DomainName(scope, "DomainName", {
        domainName,
        certificate,
    });
}
function createARecords(scope, hostedZone, domainName, apigDomain) {
    // create DNS record
    const recordProps = {
        recordName: domainName,
        zone: hostedZone,
        target: route53.RecordTarget.fromAlias(new route53Targets.ApiGatewayv2DomainProperties(apigDomain.regionalDomainName, apigDomain.regionalHostedZoneId)),
    };
    const records = [
        new route53.ARecord(scope, "AliasRecord", recordProps),
        new route53.AaaaRecord(scope, "AliasRecordAAAA", recordProps),
    ];
    // note: If domainName is a TOKEN string ie. ${TOKEN..}, the route53.ARecord
    //       construct will append ".${hostedZoneName}" to the end of the domain.
    //       This is because the construct tries to check if the record name
    //       ends with the domain name. If not, it will append the domain name.
    //       So, we need remove this behavior.
    if (Token.isUnresolved(domainName)) {
        records.forEach((record) => {
            const cfnRecord = record.node.defaultChild;
            cfnRecord.name = domainName;
        });
    }
}
function buildDomainUrl(domainName, mappingKey) {
    // Note: If mapping key is set, the URL needs a trailing slash. Without the
    //       trailing slash, the API fails with the error
    //       {"message":"Not Found"}
    return mappingKey ? `${domainName}/${mappingKey}/` : domainName;
}
function assertDomainNameIsLowerCase(domainName) {
    if (domainName !== domainName.toLowerCase()) {
        throw new Error(`The domain name needs to be in lowercase`);
    }
}
function parseRoute53Domain(domainName) {
    const parts = domainName.split(".");
    // If the domain contains subdomain, ie. api.example.com,
    // strip the subdomain and use the root domain, ie. example.com.
    // Otherwise, use the domain as is.
    return parts.length <= 2 ? domainName : parts.slice(1).join(".");
}
