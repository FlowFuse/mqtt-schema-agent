const { generateSchema } = require('../../../lib/schema-generator/index')
const Ajv = require('ajv')
const validator = new Ajv()

const TESTCASES = [
    'abc',
    123,
    false,
    true,
    null,
    {},
    { a: 1, b: 2, c: null, d: [1, 2, 3] },
    { a: { b: { c: 1 } } },
    [],
    [1, 2, 3],
    ['a', 'b', 'c'],
    [true, 'a', 1],
    [{ a: 1 }, { b: 'abc' }],
    {
        Account: {
            'Account Name': 'Firefly',
            Order: [
                {
                    OrderID: 'order103',
                    Product: [
                        {
                            'Product Name': 'Bowler Hat',
                            ProductID: 858383,
                            SKU: '0406654608',
                            Description: {
                                Colour: 'Purple',
                                Width: 300,
                                Height: 200,
                                Depth: 210,
                                Weight: 0.75
                            },
                            Price: 34.45,
                            Quantity: 2
                        },
                        {
                            'Product Name': 'Trilby hat',
                            ProductID: 858236,
                            SKU: '0406634348',
                            Description: {
                                Colour: 'Orange',
                                Width: 300,
                                Height: 200,
                                Depth: 210,
                                Weight: 0.6
                            },
                            Price: 21.67,
                            Quantity: 1
                        }
                    ]
                },
                {
                    OrderID: 'order104',
                    Product: [
                        {
                            'Product Name': 'Bowler Hat',
                            ProductID: 858383,
                            SKU: '040657863',
                            Description: {
                                Colour: 'Purple',
                                Width: 300,
                                Height: 200,
                                Depth: 210,
                                Weight: 0.75
                            },
                            Price: 34.45,
                            Quantity: 4
                        },
                        {
                            ProductID: 345664,
                            SKU: '0406654603',
                            'Product Name': 'Cloak',
                            Description: {
                                Colour: 'Black',
                                Width: 30,
                                Height: 20,
                                Depth: 210,
                                Weight: 2
                            },
                            Price: 107.99,
                            Quantity: 1
                        }
                    ]
                }
            ]
        }
    }
]

describe('Schema Generator', function () {
    TESTCASES.forEach((value, index) => {
        it('generates valid schema ' + index, function () {
            const schema = generateSchema(value)
            const validate = validator.compile(schema)
            const valid = validate(value)
            if (!valid) {
                console.debug(`Value: ${JSON.stringify(value)}`)
                console.debug(`Schema: ${JSON.stringify(schema)}`)
                console.debug(`Errors: ${validate.errors}`)
                valid.should.be.true()
            }
        })
    })
})
