// Get the type description of a value.
// This only needs to handle JSON-compatible values:
//  - object
//  - array
//  - string
//  - number
//  - boolean
//  - null
function getObjectType (obj) {
    let type = typeof obj
    if (type === 'object') {
        if (Array.isArray(obj)) {
            type = 'array'
        } else if (obj === null) {
            type = 'null'
        }
    }
    return type
}

function handleArray (obj) {
    const schema = {
        type: 'array'
    }
    // Check types of array values.
    let arrayType
    let multipleTypes = false
    let itemsSchema
    for (let i = 0; i < obj.length; i++) {
        const elementSchema = generateSchema(obj[i])
        const elementType = elementSchema.type
        if (i > 0 && elementType !== arrayType) {
            // Mixed fundamental types in the array.
            multipleTypes = true
            // For now, we just skip trying to representing multiple types
            break
        } else {
            arrayType = elementType
            if (elementType === 'object') {
                if (!itemsSchema) {
                    itemsSchema = elementSchema
                } else {
                    // Merge the properties of multiple objects rather than
                    // try to create oneOf type schemas
                    const keys = Object.keys(elementSchema.properties)
                    keys.forEach(key => {
                        if (!Object.hasOwn(itemsSchema.properties, key)) {
                            itemsSchema.properties[key] = elementSchema.properties[key]
                        }
                    })
                }
            } else if (elementType === 'array') {
                if (!itemsSchema) {
                    itemsSchema = elementSchema
                } else {
                    // TODO: Check if they match
                }
            } else {
                itemsSchema = generateSchema(obj[i])
            }
        }
    }
    if (!multipleTypes && arrayType) {
        schema.items = itemsSchema
    }
    return schema
}

function handleObject (obj) {
    const schema = {
        type: 'object',
        properties: {}
    }
    for (const [key, value] of Object.entries(obj)) {
        schema.properties[key] = generateSchema(value)
    }

    return schema
}

/**
 * Generates a JSONSchema doc for the provided value.
 * This assumes the value comes from a JSON-parsed string - so only handles the
 * strict subset of valid JSON types.
 * Limitations:
 *  - Arrays of mixed types - doesn't include type information
 *  - Arrays of Objects with different properties - returns the set of all properties seen
 *    - If a property has different types in different objects, the first type is returned
 * @param {*} obj The JSON-parsed value to generate a schema for
 * @returns The JSONSchema for the provided value
 */
function generateSchema (obj) {
    const type = getObjectType(obj)
    switch (type) {
        case 'object':
            return handleObject(obj)
        case 'array':
            return handleArray(obj)
        default:
            return {
                type
            }
    }
}
module.exports = {
    generateSchema
}
