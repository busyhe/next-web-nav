import { idToUuid, getBlockTitle, getPageTitle, getTextContent } from "notion-utils"
import api from "./core"

export default function getAllPageIds(
  collectionQuery: Record<string, any>,
  collectionId: string,
  collectionView: Record<string, any>,
  viewIds: string[]
) {
  if (!collectionQuery && !collectionView) {
    return []
  }
  try {
    if (viewIds && viewIds.length > 0) {
      const view = collectionQuery[collectionId][viewIds[0]]
      const groups = view.table_groups.results
        .filter((group: { value: { value: any } }) => group.value.value)
        .map((group: { value: { value: { value: string } } }) => {
          const title = group.value.value.value
          return {
            title,
            items: view[`results:text:${title}`]?.blockIds
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
 * @returns {Object} Properties object containing icon, title, desc and link
 */
export function getPageProperties(
  id: string,
  value: any,
  schema: Record<string, any>,
  authToken: string,
  tagOptions: any
) {
   const rawProperties = Object.entries(value?.properties || [])
  const properties = {
    icon: value?.format?.page_icon,
    title: "",
    desc: "",
    link: ""
  }

  for (let i = 0; i < rawProperties.length; i++) {
    const [key, val] = rawProperties[i]
    const propertyName = schema[key]?.name
    if (propertyName && propertyName in properties) {
      properties[propertyName as keyof typeof properties] = getTextContent(val as any)
    }
  }

  return properties
}

export const getSites = async ( ) => {
  const envPageId = process.env.NOTION_PAGE_ID

  if(!envPageId) return []
  const pageId = idToUuid(envPageId)

  const recordMap = await api.getPage(pageId, {
    fetchCollections: true,
    fetchMissingBlocks: true,
    kyOptions: {
      timeout: 60000
    }
  })

  const collection = Object.values(recordMap.collection)[0]?.value
  const collectionQuery = recordMap.collection_query
  const block = recordMap.block
  const schema = collection?.schema
  const rawMetadata = block[pageId].value
  const collectionView = recordMap.collection_view
  const collectionId = Object.keys(recordMap.collection)[0]
  const viewIds = (rawMetadata as any).view_ids

  const title = getPageTitle(recordMap)

  const pageIds = getAllPageIds(collectionQuery, collectionId, collectionView, viewIds)

  const sites = pageIds.filter((group: { items: string[] }) => group.items?.length > 0).map((group: { items: string[] }) => {
    const items = group.items?.map((id: string) => {
      const value = block[id]?.value
      const properties = getPageProperties(id, value, schema, "", collection?.format?.collection_page_properties)
      return properties
    })
    return { ...group, items }
  })

  return sites
}
