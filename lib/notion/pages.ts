import { idToUuid, getBlockTitle, getPageTitle, getTextContent } from "notion-utils"
import api from "./core"
import { NavData } from "@/config/site"

/**
 * 深拷贝对象
 * 根据源对象类型深度复制，支持object和array
 * @param {*} obj
 * @returns
 */
export function deepClone(obj) {
  if (Array.isArray(obj)) {
    // If obj is an array, create a new array and deep clone each element
    return obj.map((item) => deepClone(item))
  } else if (obj && typeof obj === "object") {
    const newObj = {}
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        if (obj[key] instanceof Date) {
          newObj[key] = new Date(obj[key].getTime()).toISOString()
        } else {
          newObj[key] = deepClone(obj[key])
        }
      }
    }
    return newObj
  } else {
    return obj
  }
}

export default function getAllPageIds(collectionQuery, collectionId, collectionView, viewIds) {
  if (!collectionQuery && !collectionView) {
    return []
  }
  try {
    if (viewIds && viewIds.length > 0) {
      const view = collectionQuery[collectionId][viewIds[0]]
      const groups = view.table_groups.results
        .filter((group) => group.value.value)
        .map((group) => {
          const title = group.value.value.value
          return {
            title,
            items: view[`results:text:${title}`].blockIds
          }
        })

      return groups
    }
  } catch (error) {
    console.error("Error fetching page IDs:", error)
    return []
  }
}

/**
 * 获取页面元素成员属性
 * @param {*} id
 * @param {*} value
 * @param {*} schema
 * @param {*} authToken
 * @param {*} tagOptions
 * @returns
 */
export function getPageProperties(id, value, schema, authToken, tagOptions) {
  const rawProperties = Object.entries(value?.properties || [])
  const properties = {
    icon: "",
    title: "",
    desc: "",
    link: ""
  }

  for (let i = 0; i < rawProperties.length; i++) {
    const [key, val] = rawProperties[i]
    properties[schema[key]?.name] = getTextContent(val)
  }

  return properties
}

export const getSites = async ( ) => {
  const envPageId = process.env.NOTION_PAGE_ID

  if(!envPageId) return NavData
  const pageId = idToUuid(envPageId)

  const recordMap = await api.getPage(pageId, {
    fetchCollections: true
  })

  const collection = Object.values(recordMap.collection)[0]?.value
  const collectionQuery = recordMap.collection_query
  const block = recordMap.block
  const schema = collection?.schema
  const rawMetadata = block[pageId].value
  const collectionView = recordMap.collection_view
  const collectionId = Object.keys(recordMap.collection)[0]
  const viewIds = rawMetadata?.view_ids

  const title = getPageTitle(recordMap)

  const pageIds = getAllPageIds(collectionQuery, collectionId, collectionView, viewIds)

  const sites = pageIds.map((group) => {
    group.items = group.items.map((id) => {
      const value = block[id]?.value
      const properties = getPageProperties(id, value, schema, "", collection?.format?.collection_page_properties)
      return properties
    })
    return group
  })

  return sites
}
