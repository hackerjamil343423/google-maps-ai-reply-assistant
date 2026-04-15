ALTER TABLE "workspace_members"
ADD COLUMN "access_all_businesses" boolean DEFAULT true NOT NULL;

ALTER TABLE "team_invitations"
ADD COLUMN "access_all_businesses" boolean DEFAULT true NOT NULL;

CREATE TABLE "workspace_member_business_assignments" (
  "workspace_id" uuid NOT NULL,
  "user_id" text NOT NULL,
  "business_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "workspace_member_business_assignments_workspace_id_user_id_business_id_pk"
    PRIMARY KEY ("workspace_id","user_id","business_id")
);

CREATE TABLE "team_invitation_business_assignments" (
  "invitation_id" uuid NOT NULL,
  "business_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "team_invitation_business_assignments_invitation_id_business_id_pk"
    PRIMARY KEY ("invitation_id","business_id")
);

ALTER TABLE "workspace_member_business_assignments"
ADD CONSTRAINT "workspace_member_business_assignments_workspace_id_workspaces_id_fk"
FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "workspace_member_business_assignments"
ADD CONSTRAINT "workspace_member_business_assignments_user_id_user_id_fk"
FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "workspace_member_business_assignments"
ADD CONSTRAINT "workspace_member_business_assignments_business_id_businesses_id_fk"
FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "team_invitation_business_assignments"
ADD CONSTRAINT "team_invitation_business_assignments_invitation_id_team_invitations_id_fk"
FOREIGN KEY ("invitation_id") REFERENCES "public"."team_invitations"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "team_invitation_business_assignments"
ADD CONSTRAINT "team_invitation_business_assignments_business_id_businesses_id_fk"
FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;

CREATE INDEX "workspace_member_business_assignments_user_idx"
ON "workspace_member_business_assignments" USING btree ("user_id");

CREATE INDEX "workspace_member_business_assignments_business_idx"
ON "workspace_member_business_assignments" USING btree ("business_id");

CREATE INDEX "team_invitation_business_assignments_business_idx"
ON "team_invitation_business_assignments" USING btree ("business_id");
