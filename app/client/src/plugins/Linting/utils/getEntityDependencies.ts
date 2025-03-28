import {
  addWidgetPropertyDependencies,
  convertPathToString,
  getEntityNameAndPropertyPath,
} from "@appsmith/workers/Evaluation/evaluationUtils";
import { ENTITY_TYPE } from "entities/DataTree/types";
import type { DependencyMap as TDependencyMap } from "utils/DynamicBindingUtils";
import { getPropertyPath } from "utils/DynamicBindingUtils";
import { getDynamicBindings } from "utils/DynamicBindingUtils";
import { getEntityDynamicBindingPathList } from "utils/DynamicBindingUtils";
import { mergeMaps } from "./mergeMaps";
import { flatten, get, has, isString, toPath, union, uniq } from "lodash";
import { extractIdentifierInfoFromCode } from "@shared/ast";
import { PathUtils } from "./pathUtils";
import type {
  ActionEntity,
  IEntity,
  JSEntity,
  WidgetEntity,
} from "../lib/entity";
import type { DataTreeEntity } from "entities/DataTree/dataTreeFactory";

export function getEntityDependencies(
  entity: IEntity,
): TDependencyMap | undefined {
  switch (entity.getType()) {
    case ENTITY_TYPE.ACTION:
      return getActionDependencies(entity as ActionEntity);
    case ENTITY_TYPE.JSACTION:
      return getJSDependencies(entity as JSEntity);
    case ENTITY_TYPE.WIDGET:
      return getWidgetDependencies(entity as WidgetEntity);
    default:
      return undefined;
  }
}
function getWidgetDependencies(widgetEntity: WidgetEntity): TDependencyMap {
  let dependencies: TDependencyMap = {};
  const widgetConfig = widgetEntity.getConfig();
  const widgetName = widgetEntity.getName();

  const widgetInternalDependencies = addWidgetPropertyDependencies({
    widgetConfig,
    widgetName,
  });

  dependencies = mergeMaps(dependencies, widgetInternalDependencies);

  const dynamicBindingPathList = getEntityDynamicBindingPathList(widgetConfig);
  const dynamicTriggerPathList = widgetConfig.dynamicTriggerPathList || [];
  const allDynamicPaths = union(dynamicTriggerPathList, dynamicBindingPathList);

  for (const dynamicPath of allDynamicPaths) {
    const propertyPath = dynamicPath.key;
    const dynamicPathDependency = getDependencyFromEntityPath(
      propertyPath,
      widgetEntity,
    );
    dependencies = mergeMaps(dependencies, dynamicPathDependency);
  }

  return dependencies;
}
function getJSDependencies(jsEntity: JSEntity): TDependencyMap {
  let dependencies: TDependencyMap = {};
  const jsActionConfig = jsEntity.getConfig();
  const jsActionReactivePaths = jsActionConfig.reactivePaths || {};

  for (const reactivePath of Object.keys(jsActionReactivePaths)) {
    const reactivePathDependency = getDependencyFromEntityPath(
      reactivePath,
      jsEntity,
    );
    dependencies = mergeMaps(dependencies, reactivePathDependency);
  }
  const jsEntityInternalDependencyMap =
    getEntityInternalDependencyMap(jsEntity);
  dependencies = mergeMaps(dependencies, jsEntityInternalDependencyMap);
  return dependencies;
}
function getActionDependencies(actionEntity: ActionEntity): TDependencyMap {
  let dependencies: TDependencyMap = {};
  const actionConfig = actionEntity.getConfig();

  const actionInternalDependencyMap =
    getEntityInternalDependencyMap(actionEntity);
  dependencies = mergeMaps(dependencies, actionInternalDependencyMap);

  const dynamicBindingPathList = getEntityDynamicBindingPathList(actionConfig);

  for (const dynamicPath of dynamicBindingPathList) {
    const propertyPath = dynamicPath.key;
    const dynamicPathDependency = getDependencyFromEntityPath(
      propertyPath,
      actionEntity,
    );
    dependencies = mergeMaps(dependencies, dynamicPathDependency);
  }

  return dependencies;
}

function getDependencyFromEntityPath(
  propertyPath: string,
  entity: IEntity,
): TDependencyMap {
  const unevalPropValue = get(
    entity.getRawEntity(),
    propertyPath,
    "",
  ).toString();
  const entityName = entity.getName();
  const { jsSnippets } = getDynamicBindings(unevalPropValue);
  const validJSSnippets = jsSnippets.filter((jsSnippet) => !!jsSnippet);
  const dynamicPathDependency: TDependencyMap = {
    [`${entityName}.${propertyPath}`]: validJSSnippets,
  };
  return dynamicPathDependency;
}

function getEntityInternalDependencyMap(entity: IEntity) {
  const entityConfig = entity.getConfig();
  const entityName = entity.getName();
  const dependencies: TDependencyMap = {};
  const internalDependencyMap: TDependencyMap = entityConfig
    ? (entityConfig as Record<string, TDependencyMap>).dependencyMap
    : {};

  for (const [path, pathDependencies] of Object.entries(
    internalDependencyMap,
  )) {
    const fullPropertyPath = `${entityName}.${path}`;
    const fullPathDependencies = pathDependencies.map(
      (dependentPath) => `${entityName}.${dependentPath}`,
    );
    dependencies[fullPropertyPath] = fullPathDependencies;
  }
  return dependencies;
}

export function getEntityPathDependencies(
  entity: IEntity,
  fullPropertyPath: string,
) {
  switch (entity.getType()) {
    case ENTITY_TYPE.ACTION:
      return getActionPropertyPathDependencies(
        entity as ActionEntity,
        fullPropertyPath,
      );
    case ENTITY_TYPE.JSACTION:
      return getJSPropertyPathDependencies(
        entity as JSEntity,
        fullPropertyPath,
      );
    case ENTITY_TYPE.WIDGET:
      return getWidgetPropertyPathDependencies(
        entity as WidgetEntity,
        fullPropertyPath,
      );
    default:
      return undefined;
  }
}

function getWidgetPropertyPathDependencies(
  widgetEntity: WidgetEntity,
  fullPropertyPath: string,
): TDependencyMap {
  const { propertyPath: entityPropertyPath } =
    getEntityNameAndPropertyPath(fullPropertyPath);
  const widgetConfig = widgetEntity.getConfig();

  const dynamicBindingPathList = getEntityDynamicBindingPathList(widgetConfig);
  const dynamicTriggerPathList = widgetConfig.dynamicTriggerPathList || [];
  const allDynamicPaths = union(dynamicTriggerPathList, dynamicBindingPathList);
  const isPathADynamicPath =
    allDynamicPaths.find(
      (dynamicPath) => dynamicPath.key === entityPropertyPath,
    ) !== undefined;

  if (!isPathADynamicPath) return {};

  const dynamicPathDependency = getDependencyFromEntityPath(
    entityPropertyPath,
    widgetEntity,
  );

  return dynamicPathDependency;
}
function getJSPropertyPathDependencies(
  jsEntity: JSEntity,
  fullPropertyPath: string,
): TDependencyMap {
  const { propertyPath: entityPropertyPath } =
    getEntityNameAndPropertyPath(fullPropertyPath);
  const jsActionConfig = jsEntity.getConfig();
  const jsActionReactivePaths = jsActionConfig.reactivePaths || {};
  const isPathAReactivePath =
    Object.keys(jsActionReactivePaths).find(
      (path) => path === entityPropertyPath,
    ) !== undefined;
  if (!isPathAReactivePath) return {};

  const reactivePathDependency = getDependencyFromEntityPath(
    entityPropertyPath,
    jsEntity,
  );
  return reactivePathDependency;
}
function getActionPropertyPathDependencies(
  actionEntity: ActionEntity,
  fullPropertyPath: string,
): TDependencyMap {
  const { propertyPath: entityPropertyPath } =
    getEntityNameAndPropertyPath(fullPropertyPath);
  const actionConfig = actionEntity.getConfig();

  const dynamicBindingPathList = getEntityDynamicBindingPathList(actionConfig);
  const isADynamicPath = dynamicBindingPathList.find(
    (path) => path.key === entityPropertyPath,
  );

  if (!isADynamicPath) return {};

  const dynamicPathDependency = getDependencyFromEntityPath(
    entityPropertyPath,
    actionEntity,
  );

  return dynamicPathDependency;
}

export function extractReferencesFromPath(
  entity: IEntity,
  fullPropertyPath: string,
  tree: Record<string, unknown>,
) {
  if (!PathUtils.isDynamicLeaf(entity, fullPropertyPath)) return [];
  const entityPropertyPath = getPropertyPath(fullPropertyPath);
  const rawEntity = entity.getRawEntity() as DataTreeEntity;
  const propertyPathContent = get(rawEntity, entityPropertyPath);
  if (!isString(propertyPathContent)) return [];

  const { jsSnippets } = getDynamicBindings(propertyPathContent, rawEntity);
  const validJSSnippets = jsSnippets.filter((jsSnippet) => !!jsSnippet);

  const referencesInPropertyPath = flatten(
    validJSSnippets.map((jsSnippet) =>
      extractReferencesFromJSSnippet(jsSnippet, tree),
    ),
  );
  return referencesInPropertyPath;
}

export function extractReferencesFromJSSnippet(
  jsSnippet: string,
  tree: Record<string, unknown>,
) {
  const { references } = extractIdentifierInfoFromCode(jsSnippet, 2);
  const prunedReferences = flatten(
    references.map((reference) => getPrunedReference(reference, tree)),
  );
  return uniq(prunedReferences);
}

function getPrunedReference(
  reference: string,
  tree: Record<string, unknown>,
): string[] {
  if (has(tree, reference)) {
    return [reference];
  }
  const subpaths = toPath(reference);
  let currentString = "";
  const references = [];
  // We want to keep going till we reach top level
  while (subpaths.length > 0) {
    currentString = convertPathToString(subpaths);
    references.push(currentString);
    // We've found the dep, add it and return
    if (has(tree, currentString)) {
      return references;
    }
    subpaths.pop();
  }

  return references;
}
