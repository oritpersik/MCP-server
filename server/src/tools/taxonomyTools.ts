import { z } from "zod";
import { ToolService } from '../services/toolService';

const SYS_BASE_URL = "https://sys-mcpim.dev-vm3-03.signatureit.app";

export const taxonomyTools = [
  {
    name: "create-taxonomy-entity-type",
    getDescription: () => ToolService.getInstance().getToolDescription('create-taxonomy-entity-type') || "Create a new taxonomy entity type",
    schema: {
      SIGSID: z.string().describe("Authentication cookie (SIGSID)"),
      tpc: z.string().describe("TPC token"),
      name: z.string().describe("Entity type name"),
      id: z.string().describe("Entity type ID"),
    },
    handler: async (args: any) => {
      const { SIGSID, tpc, name, id } = args;
      const formData = new URLSearchParams({
        action: "newEntityType",
        type: "taxonomy",
        parent: "",
        is_block: "0",
        name,
        id,
        from_tree: "",
        from_entity_type_var: "Select",
        tpc,
      });
      const response = await fetch(`${SYS_BASE_URL}/entity_taxonomy.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Cookie": `SIGSID=${SIGSID}`,
        },
        body: formData.toString(),
      });
      if (!response.ok) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to create taxonomy entity type. HTTP ${response.status}`,
            },
          ],
        };
      }
      const text = await response.text();
      return {
        content: [
          {
            type: "text",
            text: `Entity type created successfully.\n\n${text}`,
          },
        ],
      };
    }
  },
  {
    name: "get-taxonomy-tree",
    getDescription: () => ToolService.getInstance().getToolDescription('get-taxonomy-tree') || "Get taxonomy tree for a specific entity type",
    schema: {
      SIGSID: z.string().describe("Authentication cookie (SIGSID)"),
      tpc: z.string().describe("TPC token"),
      entity_type_var: z.string().describe("Taxonomy entity type (e.g. tax_catalogue, product_categories, etc.)"),
    },
    handler: async (args: any) => {
      const { SIGSID, tpc, entity_type_var } = args;
      const formData = new FormData();
      formData.append("tpc", tpc);
      const url = `${SYS_BASE_URL}/entity_type.php?action=getEntityTreeAjax&entity_type_var=${encodeURIComponent(entity_type_var)}`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Cookie": `SIGSID=${SIGSID}`,
        },
        body: formData,
      });
      if (!response.ok) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to fetch taxonomy tree. HTTP status: ${response.status}`,
            },
          ],
        };
      }
      const result = await response.text();
      return {
        content: [
          {
            type: "text",
            text: `Successfully fetched taxonomy tree for \"${entity_type_var}\":\n\n${result}`,
          },
        ],
      };
    }
  },
  {
    name: "set-entity-properties",
    getDescription: () => ToolService.getInstance().getToolDescription('set-entity-properties') || "Set entity type properties for taxonomy/catalogue",
    schema: {
      SIGSID: z.string().describe("Authentication cookie (SIGSID)"),
      tpc: z.string().describe("TPC token"),
      id: z.string().describe("Entity type ID"),
      name: z.string().describe("Entity type name"),
      entity_type_var: z.string().describe("Entity type variable (e.g. tax_catalogue)"),
    },
    handler: async (args: any) => {
      const { SIGSID, tpc, id, name, entity_type_var } = args;
      const formData = new FormData();
      formData.append("action", "setEproperties");
      formData.append("is_parent", "1");
      formData.append("solr_link", '');
      formData.append("es_settings[id]", id);
      formData.append("es_settings[name]", name);
      formData.append("es_settings[entity_type_var]", entity_type_var);
      formData.append("es_settings[hide_general_fields]", "1");
      formData.append("es_settings[use_taxonomy_as_catalog]", "1");
      formData.append("es_settings[container_related_type]", "entity_var");
      formData.append("es_settings[group_id]", "0");
      formData.append("tpc", tpc);
      const response = await fetch(`${SYS_BASE_URL}/entity_type.php`, {
        method: "POST",
        headers: {
          "Cookie": `SIGSID=${SIGSID}`,
        },
        body: formData,
      });
      if (!response.ok) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to set entity properties. HTTP status: ${response.status}`,
            },
          ],
        };
      }
      const result = await response.text();
      return {
        content: [
          {
            type: "text",
            text: `Entity properties updated successfully:\n\n${result}`,
          },
        ],
      };
    }
  },
  {
    name: "create-taxonomy-node",
    getDescription: () => ToolService.getInstance().getToolDescription('create-taxonomy-node') || "Create a new taxonomy node in a specified entity type",
    schema: {
      SIGSID: z.string().describe("Authentication cookie (SIGSID)"),
      tpc: z.string().describe("TPC token"),
      entity_type_var: z.string().describe("The taxonomy entity type (e.g., tax_catalogue)"),
      node_type_var: z.string().describe("Node type variable (e.g., tax_catalogue333)"),
      parent: z.string().describe("Parent node variable name (e.g., tax_catalogue)"),
      lang_id: z.union([z.string(), z.number()]).describe("Language ID (e.g., 1 for Hebrew)"),
      title: z.string().describe("Node title (in UTF-8 or native language)"),
      uri: z.string().optional().describe("Optional URI slug for the node"),
      entity_tree_parent: z.string().optional().describe("Parent node ID if relevant (default empty)"),
    },
    handler: async (args: any) => {
      const { SIGSID, tpc, entity_type_var, node_type_var, parent, lang_id, title, uri = "", entity_tree_parent = "" } = args;
      const formData = new FormData();
      formData.append("tpc", tpc);
      const url = `${SYS_BASE_URL}/entity_taxonomy.php?action=NewTaxonomyNode&` +
        `entity_type_var=${encodeURIComponent(entity_type_var)}` +
        `&entity_tree_parent=${encodeURIComponent(entity_tree_parent)}` +
        `&node_type_var=${encodeURIComponent(node_type_var)}` +
        `&parent=${encodeURIComponent(parent)}` +
        `&lang_id=${encodeURIComponent(lang_id)}` +
        `&title=${encodeURIComponent(title)}` +
        `&uri=${encodeURIComponent(uri)}`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Cookie": `SIGSID=${SIGSID}`,
        },
        body: formData,
      });
      if (!response.ok) {
        return {
          content: [
            {
              type: "text",
              text: `Failed to create taxonomy node. HTTP status: ${response.status}`,
            },
          ],
        };
      }
      const result = await response.text();
      return {
        content: [
          {
            type: "text",
            text: `Taxonomy node created successfully:\n\n${result}`,
          },
        ],
      };
    }
  }
]; 