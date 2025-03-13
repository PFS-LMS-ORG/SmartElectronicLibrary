"""
    Test database connection
"""

import psycopg2


def main():
    conn = psycopg2.connect('postgres://avnadmin:AVNS_JJKBtwO1yBSETQcZugi@pg-277b55e1-crudstudent.b.aivencloud.com:16378/defaultdb?sslmode=require')

    query_sql = 'SELECT VERSION()'

    cur = conn.cursor()
    cur.execute(query_sql)

    version = cur.fetchone()[0]
    print(version)


if __name__ == "__main__":
    main()