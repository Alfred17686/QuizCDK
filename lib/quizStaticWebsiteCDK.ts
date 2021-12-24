import {
  HttpApi,
  DomainName,
} from "@aws-cdk/aws-apigatewayv2";
import {
  ICertificate,
} from "@aws-cdk/aws-certificatemanager";

import { Code, Function, IFunction, Runtime } from "@aws-cdk/aws-lambda";
import {
  IRecordSet,
  RecordTarget,
} from "@aws-cdk/aws-route53";
import { Construct } from "@aws-cdk/core";
import { HttpLambdaIntegration } from "@aws-cdk/aws-apigatewayv2-integrations";

interface QuizStaticSiteCdkStackProps {
  certificate: ICertificate;
  domain: string;
  domainPrefix: string;
  staticSiteAssetsPath: string;
}

export class QuizStaticSiteCdkStack extends Construct {
  public readonly staticWebsiteLambda: IFunction;
  public readonly apiGateway: HttpApi;
  public readonly httpApiDomainName: DomainName;

  constructor(
    scope: Construct,
    id: string,
    {domain, domainPrefix, staticSiteAssetsPath, certificate} : QuizStaticSiteCdkStackProps
  ) {
    super(scope, id);

    this.staticWebsiteLambda = new Function(this, `${id}.staticWebsiteLambda`, {
      runtime: Runtime.NODEJS_12_X,
      code: Code.fromAsset(staticSiteAssetsPath),
      handler: "index.handler",
      memorySize: 1024,
    });

    this.httpApiDomainName = new DomainName(this, `${id}.HttpApi.DomainName`, {
      certificate: certificate,
      domainName: `${domainPrefix}.${domain}`,
    });

    this.apiGateway = new HttpApi(this, `${id}.HttpApi`, {
      createDefaultStage: true,
      defaultDomainMapping: {
        domainName: this.httpApiDomainName,
      },
      defaultIntegration: new HttpLambdaIntegration(
        `${id}.LambdaIntegration`,
        this.staticWebsiteLambda
      ),
    });
  }

  public getHttpApiTarget(){
    return RecordTarget.fromAlias({
      bind: (_record: IRecordSet) => ({
        dnsName: this.httpApiDomainName.regionalDomainName,
        hostedZoneId: this.httpApiDomainName.regionalHostedZoneId,
      }),
    })
  }
}