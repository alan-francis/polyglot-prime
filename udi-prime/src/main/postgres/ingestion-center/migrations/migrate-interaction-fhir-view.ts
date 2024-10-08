#!/usr/bin/env -S deno run --allow-all

/**
 * This TypeScript file implements a SQL migration feature for PostgreSQL databases using Deno.
 * It provides methods for defining and executing migrations.
 *
 * @module Information_Schema_Lifecycle_Management_Migration
 */

import * as dvp from "https://raw.githubusercontent.com/netspective-labs/sql-aide/v0.13.34/pattern/data-vault/mod.ts";
import { pgSQLa } from "https://raw.githubusercontent.com/netspective-labs/sql-aide/v0.13.34/pattern/pgdcp/deps.ts";
// import * as migrate from "../../../../../../../../netspective-labs/sql-aide/pattern/postgres/migrate.ts";

// deconstructed modules provide convenient access to internal imports
const { typical: typ, typical: { SQLa, ws } } = dvp;

type EmitContext = dvp.typical.SQLa.SqlEmitContext;

interface MigrationVersion {
  readonly description: string;
  readonly dateTime: Date;
}

enum StateStatus {
  STATEFUL = "_stateful_",
  IDEMPOTENT = "_idempotent_",
}

const prependMigrateSPText = "migrate_";

const ingressSchema = SQLa.sqlSchemaDefn("techbd_udi_ingress", {
  isIdempotent: true,
});

const assuranceSchema = SQLa.sqlSchemaDefn("techbd_udi_assurance", {
  isIdempotent: true,
});

const diagnosticsSchema = SQLa.sqlSchemaDefn("techbd_udi_diagnostics", {
  isIdempotent: true,
});

export const dvts = dvp.dataVaultTemplateState<EmitContext>({
  defaultNS: ingressSchema,
});

// Function to read SQL from a list of .psql files
async function readSQLFiles(filePaths: readonly string[]): Promise<string[]> {
  const sqlContents = [];
  for (const filePath of filePaths) {
    try {
      const absolutePath = new URL(filePath, import.meta.url).pathname;
      const data = await Deno.readTextFile(absolutePath);
      sqlContents.push(data);
    } catch (err) {
      console.error(`Error reading file ${filePath}:`, err);
      throw err;
    }
  }
  return sqlContents;
}

// List of dependencies and test dependencies
const dependencies = [
  "../001_idempotent_interaction.psql",
] as const;

// Read SQL queries from files
const dependenciesSQL = await readSQLFiles(dependencies);
const testMigrateDependenciesWithPgtap = [
  "../../../../test/postgres/ingestion-center/004-idempotent-migrate-unit-test.psql",
  "../../../../test/postgres/ingestion-center/suite.pgtap.psql",
] as const;

const ctx = SQLa.typicalSqlEmitContext({
  sqlDialect: SQLa.postgreSqlDialect(),
});

const infoSchemaLifecycle = SQLa.sqlSchemaDefn("info_schema_lifecycle", {
  isIdempotent: true,
});


export const migrationInput: MigrationVersion = {
  description: "interaction-view",
  dateTime: new Date(2024, 7, 18, 18, 16),
};
function formatDateToCustomString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth()).padStart(2, "0"); // Month is zero-based
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}_${month}_${day}_${hours}_${minutes}`;
}

export const migrateVersion = formatDateToCustomString(migrationInput.dateTime);

const migrateSP = pgSQLa.storedProcedure(
  prependMigrateSPText + "v" + migrateVersion + StateStatus.IDEMPOTENT +
    migrationInput.description,
  {},
  (name, args, _) =>
    pgSQLa.typedPlPgSqlBody(name, args, ctx, {
      autoBeginEnd: false,
    }),
  {
    embeddedStsOptions: SQLa.typicalSqlTextSupplierOptions(),
    autoBeginEnd: false,
    isIdempotent: true,
    sqlNS: infoSchemaLifecycle,
    headerBodySeparator: "$migrateVersionSP$",
  },
)`
    BEGIN

      
      ${dependenciesSQL}
      CREATE INDEX IF NOT EXISTS  sat_interaction_http_request_jsonb_extracted_nature_nature_idx ON techbd_udi_ingress.sat_interaction_http_request USING btree((nature ->> 'nature'));
      DROP INDEX IF EXISTS techbd_udi_ingress.sat_interaction_http_request_created_at_idx;
      CREATE INDEX IF NOT EXISTS sat_interaction_http_request_created_at_idx ON techbd_udi_ingress.sat_interaction_http_request USING btree (created_at DESC);
      CREATE INDEX IF NOT EXISTS  sat_interaction_http_request_payload_user_agent_idx ON techbd_udi_ingress.sat_interaction_http_request USING gin ((payload -> 'request' -> 'userAgent'));
      CREATE INDEX IF NOT EXISTS  sat_interaction_http_request_payload_clientip_idx ON techbd_udi_ingress.sat_interaction_http_request USING gin ((payload -> 'request' -> 'clientIpAddress'));
      CREATE INDEX IF NOT EXISTS  sat_interaction_http_request_payload_issues_idx ON techbd_udi_ingress.sat_interaction_http_request USING gin (((payload -> 'response' -> 'responseBody' -> 'OperationOutcome' -> 'validationResults' -> 0) -> 'issues'));
      CREATE INDEX IF NOT EXISTS  sat_interaction_http_request_payload_response_header_idx ON techbd_udi_ingress.sat_interaction_http_request USING gin ((payload -> 'response' -> 'headers'));
      CREATE INDEX IF NOT EXISTS  sat_interaction_http_request_payload_entry_idx ON techbd_udi_ingress.sat_interaction_http_request USING gin ((payload -> 'entry'));
      CREATE INDEX IF NOT EXISTS  sat_interaction_http_request_payload_user_agent_text_idx ON techbd_udi_ingress.sat_interaction_http_request USING btree ((payload -> 'request' ->> 'userAgent'));
      CREATE INDEX IF NOT EXISTS  sat_interaction_http_request_payload_clientip_text_idx ON techbd_udi_ingress.sat_interaction_http_request USING btree ((payload -> 'request' ->> 'clientIpAddress'));
      CREATE INDEX IF NOT EXISTS sat_interaction_http_request_from_state_idx ON techbd_udi_ingress.sat_interaction_http_request USING btree (from_state);
      CREATE INDEX IF NOT EXISTS sat_interaction_http_request_to_state_idx ON techbd_udi_ingress.sat_interaction_http_request USING btree (to_state);
      CREATE INDEX IF NOT EXISTS sat_interaction_http_request_jsonb_extracted_nature_idx ON techbd_udi_ingress.sat_interaction_http_request USING btree (((payload ->> 'nature'::text)));
      CREATE INDEX IF NOT EXISTS sat_interaction_http_request_jsonb_extracted_payload_idx ON techbd_udi_ingress.sat_interaction_http_request USING gin (payload);
      CREATE INDEX IF NOT EXISTS sat_interaction_http_request_jsonb_extracted_tenant_id_idx ON techbd_udi_ingress.sat_interaction_http_request USING btree ((((payload -> 'nature'::text) ->> 'tenant_id'::text)));
      CREATE INDEX IF NOT EXISTS sat_interaction_http_request_nature_idx ON techbd_udi_ingress.sat_interaction_http_request USING gin (nature);

      ANALYZE techbd_udi_ingress.hub_interaction;
      ANALYZE techbd_udi_ingress.sat_interaction_http_request;
      ANALYZE techbd_udi_ingress.sat_interaction_http_request;


      
    END
  `;

/**
 * Generates SQL Data Definition Language (DDL) for the migrations.
 *
 * @returns {string} The SQL DDL for migrations.
 */

function sqlDDLGenerateMigration() {
  return SQLa.SQL<EmitContext>(dvts.ddlOptions)`
    
    ${migrateSP}

    `;
}

export function generated() {
  const ctx = SQLa.typicalSqlEmitContext({
    sqlDialect: SQLa.postgreSqlDialect(),
  });
  const testDependencies: string[] = [];
  for (const filePath of testMigrateDependenciesWithPgtap) {
    try {
      const absolutePath = import.meta.resolve(filePath);
      testDependencies.push(absolutePath);
    } catch (err) {
      console.error(`Error reading filepath ${filePath}:`, err);
      throw err;
    }
  }

  // after this execution `ctx` will contain list of all tables which will be
  // passed into `dvts.pumlERD` below (ctx should only be used once)
  const driverGenerateMigrationSQL = ws.unindentWhitespace(
    sqlDDLGenerateMigration().SQL(ctx),
  );
  return {
    driverGenerateMigrationSQL,
    pumlERD: dvts.pumlERD(ctx).content,
    destroySQL: ws.unindentWhitespace(``),
    testDependencies,
  };
}
